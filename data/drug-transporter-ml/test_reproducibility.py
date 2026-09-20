import csv
import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np

from module.core import brute_force as bf

class BruteForceContracts(unittest.TestCase):
    def run_fixture(self, feature_count=3, k=2):
        data = np.arange(4 * feature_count).reshape(4, feature_count)
        seen = []
        def evaluate(selected, labels, evaluator, classifier):
            seen.append(selected.copy())
            return 0.5
        output = io.StringIO()
        with patch.object(bf, 'eval_classifier', side_effect=evaluate), patch.object(bf, 'tqdm', side_effect=lambda items, **kw: items):
            bf.BruteForceMetabolite.run_brute_force(data, object(), [f'f{i}' for i in range(feature_count)], np.array([0, 1, 0, 1]), output, k)
        return data, seen, list(csv.reader(io.StringIO(output.getvalue())))

    def test_each_classifier_receives_only_named_feature_pair(self):
        data, seen, rows = self.run_fixture()
        expected = [data[:, [0, 1]], data[:, [0, 2]], data[:, [1, 2]]]
        self.assertEqual(len(seen), 6)
        for actual, selected in zip(seen, [x for pair in expected for x in (pair, pair)]):
            np.testing.assert_array_equal(actual, selected)

    def test_final_partial_batch_is_written(self):
        _, _, rows = self.run_fixture()
        self.assertEqual(rows, [['Feature 0', 'Feature 1', 'Random Forest', 'Decision Tree'], ['f0', 'f1', '0.5', '0.5'], ['f0', 'f2', '0.5', '0.5'], ['f1', 'f2', '0.5', '0.5']])

    def test_full_batch_and_tail_are_written_once(self):
        _, _, rows = self.run_fixture(feature_count=12, k=1)
        self.assertEqual([row[0] for row in rows[1:]], [f'f{i}' for i in range(12)])

import os
import subprocess
import tempfile
from contextlib import contextmanager
import neat
from module.core.dataloader import DataLoaderMetabolite
from module.core.utilities import BaseGA, MODULE_DIR

@contextmanager
def elsewhere():
    old = Path.cwd()
    with tempfile.TemporaryDirectory() as directory:
        os.chdir(directory)
        try:
            yield Path(directory)
        finally:
            os.chdir(old)

class StartupContracts(unittest.TestCase):
    def test_packaged_data_loads_outside_module_directory(self):
        with elsewhere():
            loader = DataLoaderMetabolite()
            for method, shape, classes in [(loader.load_oat1_3_small, (51, 32), 3), (loader.load_oat1_3_large, (73, 32), 3), (loader.load_oat1_3_p_combined, (137, 32), 6)]:
                with self.subTest(dataset=method.__name__):
                    data, labels, header = method()
                    self.assertEqual(data.shape, shape)
                    self.assertEqual(len(header), shape[1])
                    self.assertEqual(len(set(labels)), classes)
                    self.assertTrue(np.isfinite(data).all())

    def test_all_configs_create_networks_without_evolution(self):
        with elsewhere():
            for path in sorted((MODULE_DIR / 'configs').glob('*.config')):
                with self.subTest(config=path.name):
                    conf = BaseGA().create_config('configs/' + path.name)
                    conf.pop_size = 2
                    population = neat.Population(conf)
                    genome = next(iter(population.population.values()))
                    network = neat.nn.FeedForwardNetwork.create(genome, conf)
                    result = network.activate([0.0] * conf.genome_config.num_inputs)
                    self.assertEqual(len(result), conf.genome_config.num_outputs)
                    self.assertTrue(np.isfinite(result).all())

    def test_checkpoint_creates_output_and_round_trips(self):
        with elsewhere() as directory:
            algo = BaseGA('configs/metabolite_BI.config', checkpoint_prefix='smoke_')
            conf = algo.create_config(algo.conf_filepath)
            conf.pop_size = 2
            with patch.object(algo, 'create_config', return_value=conf):
                conf, population, stats = algo.create_session(1)
            checkpointer = next(r for r in population.reporters.reporters if isinstance(r, neat.Checkpointer))
            self.assertEqual(checkpointer.generation_interval, 1)
            checkpointer.save_checkpoint(conf, population.population, population.species, 0)
            checkpoint = directory / 'output' / 'smoke_.checkpoint0'
            restored = neat.Checkpointer.restore_checkpoint(str(checkpoint))
            self.assertEqual(set(restored.population), set(population.population))
            self.assertEqual(restored.generation, 0)
            self.assertEqual(restored.config.genome_config.num_inputs, 32)

    def test_dataset_entrypoints_create_and_close_csv(self):
        with elsewhere() as directory:
            fixture = (np.ones((4, 2)), np.array([0, 1, 0, 1]), np.array(['a', 'b']))
            for method, loader_name, code in [('metabolite_small_dataset', 'load_oat1_3_small', 'sm'), ('metabolite_large_dataset', 'load_oat1_3_large', 'lg'), ('metabolite_combined_dataset', 'load_oat1_3_p_combined', 'cm')]:
                with self.subTest(dataset=method), patch.object(bf.DataLoaderMetabolite, loader_name, return_value=fixture), patch.object(bf, 'prompt_num_features', return_value=1), patch.object(bf, 'eval_classifier', return_value=0.5):
                    getattr(bf.BruteForceMetabolite, method)()
                    path = directory / 'output' / f'BF_metab_{code}_raw_1.csv'
                    self.assertEqual(len(path.read_text().splitlines()), 3)

    def test_documented_cli_quits_successfully(self):
        result = subprocess.run([sys.executable, '-B', '-m', 'module'], cwd=MODULE_DIR.parent, input='q\n', text=True, capture_output=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('dataset', result.stdout)


class SyntheticGAExecution(unittest.TestCase):
    def run_ga_fixture(self, kind):
        with elsewhere() as directory:
            script = Path(__file__).resolve().with_name('ga_smoke.py')
            result = subprocess.run([sys.executable, '-B', str(script), kind], cwd=directory,
                                    text=True, capture_output=True, timeout=60)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('synthetic execution only; plots unverified', result.stdout)

    def test_selection_entrypoint_one_synthetic_generation(self):
        self.run_ga_fixture('selection')

    def test_engineering_entrypoint_one_synthetic_generation(self):
        self.run_ga_fixture('engineering')


if __name__ == '__main__':
    unittest.main()
