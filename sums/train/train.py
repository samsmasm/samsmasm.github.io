"""Train a small digit CNN on MNIST and export int8 weights for sums/model.js.

Architecture (must match sums/digits.js):
  conv 1->16 3x3 pad1, relu, maxpool2   28 -> 14
  conv 16->32 3x3 pad1, relu, maxpool2  14 -> 7
  conv 32->64 3x3 pad1, relu, maxpool2  7 -> 3
  fc 576->64 relu, fc 64->17

Classes 0-9 are digits; 10-16 are BACKWARDS (mirrored) 2 3 4 5 6 7 9, so a
child's backwards 5 isn't confused with a real 2. Mirrored 0, 1, 8 keep
their own labels (they look the same).
"""
import gzip, json, base64, math, sys, os
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as F

D = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]

def load(name, off):
    with gzip.open(os.path.join(D, 'mnist', name + '.gz')) as f:
        return np.frombuffer(f.read(), np.uint8, offset=off)

Xtr = torch.tensor(load('train-images-idx3-ubyte', 16).reshape(-1, 1, 28, 28), dtype=torch.float32) / 255
ytr = torch.tensor(load('train-labels-idx1-ubyte', 8), dtype=torch.long)
Xte = torch.tensor(load('t10k-images-idx3-ubyte', 16).reshape(-1, 1, 28, 28), dtype=torch.float32) / 255
yte = torch.tensor(load('t10k-labels-idx1-ubyte', 8), dtype=torch.long)

MIRRORED = [2, 3, 4, 5, 6, 7, 9]
NCLS = 10 + len(MIRRORED)
MIRROR_LABEL = torch.tensor([MIRRORED.index(d) + 10 if d in MIRRORED else d for d in range(10)])

def flip_some(x, y, frac):
    """Mirror a fraction of the batch left-right and relabel them."""
    f = torch.rand(x.shape[0]) < frac
    x = torch.where(f.view(-1, 1, 1, 1), x.flip(3), x)
    y = torch.where(f, MIRROR_LABEL[y], y)
    return x, y

class Net(nn.Module):
    def __init__(s):
        super().__init__()
        s.c1 = nn.Conv2d(1, 16, 3, padding=1)
        s.c2 = nn.Conv2d(16, 32, 3, padding=1)
        s.c3 = nn.Conv2d(32, 64, 3, padding=1)
        s.f1 = nn.Linear(576, 64)
        s.f2 = nn.Linear(64, NCLS)
    def forward(s, x):
        x = F.max_pool2d(F.relu(s.c1(x)), 2)
        x = F.max_pool2d(F.relu(s.c2(x)), 2)
        x = F.max_pool2d(F.relu(s.c3(x)), 2)
        x = F.relu(s.f1(x.flatten(1)))
        return s.f2(x)

def augment(x):
    n = x.shape[0]
    ang = (torch.rand(n) - .5) * math.radians(36)
    sc = 0.8 + torch.rand(n) * 0.35
    sx = sc * (0.8 + torch.rand(n) * 0.4)  # independent width squash/stretch
    sh = (torch.rand(n) - .5) * 0.5
    tx = (torch.rand(n) - .5) * 0.2
    ty = (torch.rand(n) - .5) * 0.2
    c, s = torch.cos(ang), torch.sin(ang)
    A = torch.zeros(n, 2, 3)
    A[:, 0, 0] = c / sx; A[:, 0, 1] = (-s + sh) / sx; A[:, 0, 2] = tx
    A[:, 1, 0] = s / sc; A[:, 1, 1] = c / sc; A[:, 1, 2] = ty
    g = F.affine_grid(A, x.shape, align_corners=False)
    x = F.grid_sample(x, g, align_corners=False)
    # random stroke thickness: dilate some, erode some
    r = torch.rand(n)
    thick = F.max_pool2d(x, 3, 1, 1)
    thin = -F.max_pool2d(-x, 2, 1, 0)
    thin = F.pad(thin, (0, 1, 0, 1))
    x = torch.where((r < .3).view(-1, 1, 1, 1), thick, x)
    x = torch.where((r > .85).view(-1, 1, 1, 1), thin, x)
    return x.clamp(0, 1)

torch.manual_seed(0)
net = Net()
EP = 12
opt = torch.optim.Adam(net.parameters(), 2e-3)
sched = torch.optim.lr_scheduler.OneCycleLR(opt, 3e-3, total_steps=EP * (60000 // 128 + 1))
for ep in range(EP):
    net.train()
    perm = torch.randperm(60000)
    for i in range(0, 60000, 128):
        idx = perm[i:i + 128]
        xb, yb = flip_some(Xtr[idx], ytr[idx], 0.25)
        xb = augment(xb)
        loss = F.cross_entropy(net(xb), yb, label_smoothing=0.05)
        opt.zero_grad(); loss.backward(); opt.step(); sched.step()
    net.eval()
    with torch.no_grad():
        acc = (net(Xte).argmax(1) == yte).float().mean().item()
        acca = (net(augment(Xte)).argmax(1) == yte).float().mean().item()
        accm = (net(Xte.flip(3)).argmax(1) == MIRROR_LABEL[yte]).float().mean().item()
    print(f'epoch {ep+1} test {acc:.4f} augmented {acca:.4f} backwards {accm:.4f}', flush=True)

# export int8 per-tensor
layers = {}
for name, p in net.state_dict().items():
    a = p.detach().numpy().astype(np.float32).ravel()
    m = float(np.abs(a).max()) or 1.0
    scale = m / 127
    q = np.round(a / scale).clip(-127, 127).astype(np.int8)
    layers[name] = {'s': scale, 'n': int(a.size), 'b': base64.b64encode(q.tobytes()).decode()}
with open(OUT, 'w') as f:
    f.write('// Digit reader weights: small CNN trained on MNIST (int8, see train.py)\n')
    f.write('window.SUMS_MODEL=' + json.dumps(layers, separators=(',', ':')) + ';\n')

# save a sample of test images + torch predictions of the quantized net for JS parity tests
with torch.no_grad():
    sd = net.state_dict()
    for name in sd:
        L = layers[name]
        q = np.frombuffer(base64.b64decode(L['b']), np.int8).astype(np.float32) * L['s']
        sd[name].copy_(torch.tensor(q).view_as(sd[name]))
    net.load_state_dict(sd)
    accq = (net(Xte).argmax(1) == yte).float().mean().item()
    print(f'quantized test {accq:.4f}')
    S = 500
    np.save(os.path.join(D, 'test_x.npy'), (Xte[:S, 0].numpy() * 255).astype(np.uint8))
    np.save(os.path.join(D, 'test_pred.npy'), net(Xte[:S]).argmax(1).numpy())
    np.save(os.path.join(D, 'test_y.npy'), yte[:S].numpy())
