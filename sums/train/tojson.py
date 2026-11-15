import json, os, sys
import numpy as np
D = os.path.dirname(os.path.abspath(__file__))
x = np.load(os.path.join(D, 'test_x.npy')).reshape(-1, 784)
out = {'x': x.tolist(), 'pred': np.load(os.path.join(D, 'test_pred.npy')).tolist(), 'y': np.load(os.path.join(D, 'test_y.npy')).tolist()}
with open(sys.argv[1], 'w') as f:
    json.dump(out, f, separators=(',', ':'))
