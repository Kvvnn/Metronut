"""
Spread coordinates: Apply non-linear scaling to expand the dense center area.
The reference image shows Seoul center taking up ~60% of the map area.
"""
import json
import math

with open('client/src/data/mapCoords.json') as f:
    raw = json.load(f)
    coords = raw['stations']

# Find center of mass (weighted by density)
xs = [c['x'] for c in coords.values()]
ys = [c['y'] for c in coords.values()]

# Current bounds
min_x, max_x = min(xs), max(xs)
min_y, max_y = min(ys), max(ys)
range_x = max_x - min_x
range_y = max_y - min_y

# Center of the map (where most stations are)
center_x = sum(xs) / len(xs)
center_y = sum(ys) / len(ys)
print(f"Center of mass: ({center_x:.0f}, {center_y:.0f})")
print(f"Bounds: X[{min_x:.0f}-{max_x:.0f}], Y[{min_y:.0f}-{max_y:.0f}]")

# Apply fisheye-like expansion from center
# Stations near center get pushed outward, stations far from center get compressed
def spread(val, center, total_range, strength=0.4):
    """Apply non-linear spread: expand center, compress edges"""
    # Normalize to [-1, 1] relative to center
    normalized = (val - center) / (total_range / 2)
    # Apply power curve - values near 0 get expanded
    sign = 1 if normalized >= 0 else -1
    abs_n = abs(normalized)
    # Use sqrt for center expansion (values < 1 get larger with sqrt)
    spread_n = sign * (abs_n ** (1 - strength))
    # Map back to coordinate space
    return center + spread_n * (total_range / 2)

# Apply spread to all coordinates
for sid, c in coords.items():
    new_x = spread(c['x'], center_x, range_x, 0.35)
    new_y = spread(c['y'], center_y, range_y, 0.35)
    coords[sid] = {'x': round(new_x, 1), 'y': round(new_y, 1)}

# Recalculate bounds after spread
xs2 = [c['x'] for c in coords.values()]
ys2 = [c['y'] for c in coords.values()]
print(f"New bounds: X[{min(xs2):.0f}-{max(xs2):.0f}], Y[{min(ys2):.0f}-{max(ys2):.0f}]")

# Normalize to fit within 100-1800 x 100-1400 range
new_min_x, new_max_x = min(xs2), max(xs2)
new_min_y, new_max_y = min(ys2), max(ys2)
new_range_x = new_max_x - new_min_x
new_range_y = new_max_y - new_min_y

target_w = 1700
target_h = 1300
offset_x = 100
offset_y = 100

for sid, c in coords.items():
    nx = offset_x + (c['x'] - new_min_x) / new_range_x * target_w
    ny = offset_y + (c['y'] - new_min_y) / new_range_y * target_h
    coords[sid] = {'x': round(nx, 1), 'y': round(ny, 1)}

# Final check
xs3 = [c['x'] for c in coords.values()]
ys3 = [c['y'] for c in coords.values()]
print(f"Final bounds: X[{min(xs3):.0f}-{max(xs3):.0f}], Y[{min(ys3):.0f}-{max(ys3):.0f}]")

raw['stations'] = coords
with open('client/src/data/mapCoords.json', 'w', encoding='utf-8') as f:
    json.dump(raw, f, separators=(',', ':'))

print("Done - coordinates spread applied")
