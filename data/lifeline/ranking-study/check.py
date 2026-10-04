"""Independent stdlib arithmetic check; never imports evaluator or application.

Reviewer previously supplied blinded model relevance labels. This is an
arithmetic/formatting check by that reviewer, not human relevance validation.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--directory', type=Path, default=Path(__file__).parent)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    folder = args.directory
    read = lambda name: json.loads((folder / name).read_text(encoding='utf-8-sig'))
    corpus, labels, vectors, reported, freeze = [read(n) for n in
        ('corpus.json', 'labels.json', 'embeddings.json', 'results.json', 'freeze.json')]
    issues, differences = [], []
    epsilon, norm_epsilon = 1e-7, 1e-6

    def compare(actual, expected, path):
        if isinstance(actual, dict):
            if not isinstance(expected, dict):
                issues.append({'path': path, 'actual': actual, 'reported': expected})
                return
            for key, value in actual.items():
                compare(value, expected.get(key), path + '.' + key)
        elif isinstance(actual, list):
            if not isinstance(expected, list) or len(actual) != len(expected):
                issues.append({'path': path, 'actual': actual, 'reported': expected})
                return
            for i, (a, b) in enumerate(zip(actual, expected)):
                compare(a, b, f'{path}[{i}]')
        elif isinstance(actual, float) and isinstance(expected, (float, int)):
            delta = abs(actual - expected)
            differences.append((delta, path))
            if not math.isfinite(delta) or delta > epsilon:
                issues.append({'path': path, 'actual': actual, 'reported': expected, 'delta': delta})
        elif actual != expected:
            issues.append({'path': path, 'actual': actual, 'reported': expected})

    norm_records = []
    for case in vectors['cases']:
        for ident, entry in [(case['id'] + '-query', case['query'])] + [(m['id'], m) for m in case['memories']]:
            v = entry['vector']
            finite = all(math.isfinite(x) for x in v)
            norm = math.sqrt(math.fsum(x*x for x in v))
            norm_records.append({'id': ident, 'dimensions': len(v), 'norm': norm, 'finite': finite})
            if len(v) != 384 or not finite or abs(norm-1) > norm_epsilon:
                issues.append({'path': 'vector.' + ident, 'dimensions': len(v), 'norm': norm, 'finite': finite})

    def cosine(a, b):
        return math.fsum(x*y for x, y in zip(a, b)) / math.sqrt(math.fsum(x*x for x in a) * math.fsum(y*y for y in b))

    def entry_text(memory):
        title, content = memory['title'].strip(), memory['content'].strip()
        text = title + ': ' + content if title and len(title) < 50 else content
        return text[:97] + '...' if len(text) > 100 else text

    def formatted(selected):
        ordered = sorted(selected, key=lambda m: (-m['importance'], m['createdDays']))[:8]
        return ''.join('\u2022 ' + entry_text(m) + '\n' for m in ordered)

    def dcg(grades):
        return math.fsum((2**g - 1)/math.log2(i+2) for i, g in enumerate(grades[:5]))

    by_labels = {c['id']: c for c in labels['cases']}
    by_vectors = {c['id']: c for c in vectors['cases']}
    by_reported = {c['id']: c for c in reported['cases']}
    compare([c['id'] for c in corpus['cases']], [c['id'] for c in reported['cases']], 'caseIds')
    recomputed, missing_clauses = [], []
    for case in corpus['cases']:
        cid = case['id']
        label, embedding, report = by_labels[cid], by_vectors[cid], by_reported[cid]
        grades = {m['id']: m['relevance'] for m in label['memories']}
        superseded = {m['id'] for m in label['memories'] if m['superseded']}
        mem_vectors = {m['id']: m['vector'] for m in embedding['memories']}
        initial = sorted(case['memories'], key=lambda m: (-m['importance'], m['ageDays']))
        scores = []
        for m in initial:
            sim = cosine(embedding['query']['vector'], mem_vectors[m['id']])
            composite = .6*sim + .3*m['importance'] + .1*(1-min(1,m['ageDays']/30))
            scores.append({'id': m['id'], 'cosine': sim, 'composite': composite, 'eligible': sim >= .3})
        score_lookup = {s['id']: s for s in scores}
        eligible = [m for m in initial if score_lookup[m['id']]['eligible']]
        result = {'id': cid, 'answerable': label['answerable'], 'arms': {}}
        for arm in ('composite', 'cosine'):
            selected = sorted(eligible, key=lambda m: -score_lookup[m['id']][arm])[:5]
            ids = [m['id'] for m in selected]
            context = formatted(selected)
            facts = label['essentialFacts']
            retained = [f['id'] for f in facts if f['quote'] in context]
            selected_facts = [f['id'] for f in facts if f['memoryId'] in ids]
            lost = [fid for fid in selected_facts if fid not in retained]
            essential_count = sum(g == 2 for g in grades.values())
            metrics = {
                'essentialRecall': sum(grades[x] == 2 for x in ids)/essential_count if label['answerable'] else None,
                'precisionAtReturnedCount': (sum(grades[x] >= 1 for x in ids)/len(ids) if ids else 0) if label['answerable'] else None,
                'ndcgAt5': dcg([grades[x] for x in ids])/dcg(sorted(grades.values(), reverse=True)) if label['answerable'] else None,
                'essentialFactRecallAfterFormat': len(retained)/len(facts) if label['answerable'] else None,
                'essentialFactIdsRetained': retained, 'selectedEssentialFactIds': selected_facts,
                'selectedFactIdsLostToFormatter': lost, 'selectedFactsLostToFormatter': len(lost),
                'supersededCount': len(set(ids) & superseded), 'selectedCount': len(ids), 'anySelection': bool(ids),
            }
            outcome = {'initialOrmOrder': [m['id'] for m in initial], 'scores': scores,
                'eligibleIds': [m['id'] for m in eligible], 'selectedIds': ids,
                'formattedContext': context, 'metrics': metrics,
                'relevantExcludedByThreshold': [m['id'] for m in case['memories'] if grades[m['id']] >= 1 and not score_lookup[m['id']]['eligible']],
                'essentialExcludedByThreshold': [m['id'] for m in case['memories'] if grades[m['id']] == 2 and not score_lookup[m['id']]['eligible']]}
            compare(outcome, report['arms'][arm], cid + '.' + arm)
            result['arms'][arm] = outcome
        result.update(moreThanFiveEligible=len(eligible) > 5,
            identicalSelectedSets=set(result['arms']['composite']['selectedIds']) == set(result['arms']['cosine']['selectedIds']),
            identicalFormattedContexts=result['arms']['composite']['formattedContext'] == result['arms']['cosine']['formattedContext'])
        compare({k: v for k,v in result.items() if k != 'arms'}, report, cid)
        recomputed.append(result)
        if cid in ('q05', 'q12'):
            mid = 'q05-m03' if cid == 'q05' else 'q12-m06'
            memory = next(m for m in case['memories'] if m['id'] == mid)
            clause = 'I lent the lighthouse jigsaw to the Riverbend Craft Circle.' if cid == 'q05' else 'In moon sketches, a small question mark beside a feature means I am uncertain about it.'
            full = memory['title'].strip() + ': ' + memory['content'].strip()
            start = full.index(clause)
            wholly_beyond_prefix = start >= 97
            record = {'caseId': cid, 'memoryId': mid, 'clause': clause, 'clauseStartInUntruncatedEntry': start,
                'prefixLength': 97, 'entireClauseBeyondPrefix': wholly_beyond_prefix,
                'formattedEntry': entry_text(memory), 'selectedInBothArms': all(mid in result['arms'][a]['selectedIds'] for a in ('composite','cosine'))}
            missing_clauses.append(record)
            if not wholly_beyond_prefix or clause in entry_text(memory):
                issues.append({'path': cid + '.missingClause', 'actual': record})

    answerable = [c for c in recomputed if c['answerable']]
    metric_names = ['essentialRecall', 'precisionAtReturnedCount', 'ndcgAt5', 'essentialFactRecallAfterFormat', 'selectedFactsLostToFormatter', 'supersededCount']
    macro = {arm: {name: math.fsum(c['arms'][arm]['metrics'][name] for c in answerable)/len(answerable) for name in metric_names} for arm in ('composite','cosine')}
    paired = {}
    for name in metric_names:
        diffs = [c['arms']['composite']['metrics'][name]-c['arms']['cosine']['metrics'][name] for c in answerable]
        direction = -1 if name in ('selectedFactsLostToFormatter','supersededCount') else 1
        paired[name] = {'compositeWins': sum(x*direction > epsilon for x in diffs), 'ties': sum(abs(x) <= epsilon for x in diffs), 'compositeLosses': sum(x*direction < -epsilon for x in diffs)}
    opportunity = {name+'CaseIds': [c['id'] for c in recomputed if c[name]] for name in ('moreThanFiveEligible','identicalSelectedSets','identicalFormattedContexts')}
    unanswerable = {arm: {'anySelectionCount': sum(c['arms'][arm]['metrics']['anySelection'] for c in recomputed if not c['answerable']),
        'selectedMemoryCount': sum(c['arms'][arm]['metrics']['selectedCount'] for c in recomputed if not c['answerable'])} for arm in ('composite','cosine')}
    for key, value in [('macroAnswerable',macro),('pairedAnswerable',paired),('selectionOpportunity',opportunity),('unanswerable',unanswerable)]:
        compare(value, reported[key], key)
    compare(len(answerable), reported['answerableCount'], 'answerableCount')
    compare(len(recomputed)-len(answerable), reported['unanswerableCount'], 'unanswerableCount')
    hashes = {}
    for name in ('corpus.json','labels.json','protocol.md','evaluate.py'):
        if (folder/name).exists() and name in freeze.get('files',{}):
            # Hash only; evaluator source is never executed, imported, or read as code.
            actual = hashlib.sha256((folder/name).read_bytes()).hexdigest()
            hashes[name] = {'actual':actual, 'frozen':freeze['files'][name], 'matches':actual == freeze['files'][name]}
            if not hashes[name]['matches']:
                issues.append({'path':'freeze.'+name, **hashes[name]})
    output = {'schema':'lifeline-independent-check/v1', 'status':'PASS' if not issues else 'DISAGREEMENTS',
        'role':'Previously blinded model relevance judge, now independent arithmetic checker; not human review.',
        'implementation':'Python standard-library math/json; no evaluator imports, application imports, inference, or network.',
        'scoreAndMetricEpsilon':epsilon, 'unitNormEpsilon':norm_epsilon,
        'maximumNumericDifference': max((x[0] for x in differences),default=0),
        'maximumScoreDifference':max((x[0] for x in differences if '.scores[' in x[1]),default=0),
        'vectorCount':len(norm_records),'maximumUnitNormError':max(abs(n['norm']-1) for n in norm_records),
        'vectorNorms':norm_records,'freezeChecks':hashes,'caseCount':len(recomputed),'answerableCount':len(answerable),
        'macroAnswerable':macro,'pairedAnswerable':paired,'selectionOpportunity':opportunity,'unanswerable':unanswerable,
        'missingClauseChecks':missing_clauses,'cases':recomputed,'disagreements':issues,
        'limitations':['Label ambiguity q07 is preserved unchanged.','Checks arithmetic and deterministic formatting only, not model inference correctness or human relevance truth.','Formatter rules independently transcribed after reading original function and constants; title length <50, entry length >100 truncates to 97 plus ellipsis, importance/created_at ordering, at most eight entries.']}
    destination = args.output or folder/'independent-results.json'
    destination.write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps({k:output[k] for k in ('status','caseCount','answerableCount','vectorCount','maximumNumericDifference','maximumScoreDifference','maximumUnitNormError','disagreements')}))
    raise SystemExit(0 if not issues else 1)


if __name__ == '__main__':
    main()
