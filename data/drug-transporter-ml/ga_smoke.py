"""Synthetic execution fixture, never a research evaluation or visual check."""
import io
import random
import sys
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from module import visualize
from module.core import feature_selection_GA as selection
from module.core import feature_engineering_GA as engineering
from module.core.dataloader import DataLoaderMetabolite
from module.core.utilities import BaseGA, random_forest_config_parameters

kind = sys.argv[1]
implementation = {'selection': selection.FeatureSelectionGA,
                  'engineering': engineering.FeatureEngineering}[kind]
random.seed(1729)
data = np.random.default_rng(1729).normal(size=(6, 32))
labels = np.array([0, 1, 2, 0, 1, 2])
header = np.array([f'synthetic_{i}' for i in range(32)])
original_create_config = BaseGA.create_config

def bounded_config(self, path):
    config = original_create_config(self, path)
    config.pop_size = 2
    config.reproduction_config.min_species_size = 1
    return config

# The real entrypoint, NEAT run and selected fitness function all execute.
# Replace only fixture data/budget/input and external graphical side effects.
with patch.object(DataLoaderMetabolite, 'load_oat1_3_small', return_value=(data, labels, header)), \
     patch('builtins.input', return_value='1'), \
     patch.object(BaseGA, 'create_config', bounded_config), \
     patch.dict(random_forest_config_parameters, {'n_estimators': 2, 'random_state': 1729}), \
     patch.object(visualize, 'draw_net') as draw, \
     patch.object(visualize, 'plot_stats') as stats, \
     patch.object(visualize, 'plot_species') as species, \
     redirect_stdout(io.StringIO()):
    implementation.metabolite_small_dataset()
    assert draw.call_count == stats.call_count == species.call_count == 1
    winner = draw.call_args.args[1]
    assert np.isfinite(winner.fitness)
    assert 0.0 <= winner.fitness <= 1.0
    statistics = stats.call_args.args[0]
    assert len(statistics.most_fit_genomes) == 1
print(f'PASS: {kind}; synthetic execution only; plots unverified')
