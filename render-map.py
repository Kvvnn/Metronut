import json
import cairosvg

with open('client/src/data/mapCoords.json') as f:
    coords = json.load(f)['stations']

with open('client/src/data/metroData.json') as f:
    metro = json.load(f)

line_colors = {
    '1': '#0052A4', '2': '#00A84D', '3': '#EF7C1C', '4': '#00A5DE',
    '5': '#996CAC', '6': '#CD7C2F', '7': '#747F00', '8': '#E6186C',
    '9': '#BDB092', 'shinbundang': '#D4003B', 'airport': '#0090D2',
    'gyeongui': '#77C4A3', 'suinbundang': '#F5A200', 'gyeongchun': '#178C72',
    'ui': '#B0CE18', 'gimpo': '#AD8605', 'incheon1': '#7CA8D5',
    'incheon2': '#ED8B00', 'seohaeline': '#8BC53F', 'sinlim': '#6789CA',
    'gtxa': '#9A6292'
}

svg_parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 1600" width="2000" height="1600">']
svg_parts.append('<rect width="2000" height="1600" fill="#f8f9fa"/>')

# Check edge format
edges = metro.get('edges', [])
print(f"Total edges: {len(edges)}")
if edges:
    print(f"Sample edge: {edges[0]}")

# Count drawn edges
drawn = 0
missing_src = 0
missing_tgt = 0

for edge in edges:
    src = edge.get('source', edge.get('from', ''))
    tgt = edge.get('target', edge.get('to', ''))
    line_id = edge.get('lineId', edge.get('line', ''))
    
    if not src or not tgt:
        continue
    if src not in coords:
        missing_src += 1
        continue
    if tgt not in coords:
        missing_tgt += 1
        continue
    
    x1, y1 = coords[src]['x'], coords[src]['y']
    x2, y2 = coords[tgt]['x'], coords[tgt]['y']
    color = line_colors.get(line_id, '#999')
    svg_parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="8" stroke-linecap="round"/>')
    drawn += 1

print(f"Drawn edges: {drawn}")
print(f"Missing source: {missing_src}")
print(f"Missing target: {missing_tgt}")

# Draw transfer stations larger
transfers = set()
for s in metro['stations']:
    if s.get('transfers'):
        transfers.add(s['id'])

# Regular stations
for sid, pos in coords.items():
    if sid not in transfers:
        svg_parts.append(f'<circle cx="{pos["x"]}" cy="{pos["y"]}" r="4" fill="white" stroke="#666" stroke-width="1.5"/>')

# Transfer stations
for sid in transfers:
    if sid in coords:
        pos = coords[sid]
        svg_parts.append(f'<circle cx="{pos["x"]}" cy="{pos["y"]}" r="7" fill="white" stroke="#333" stroke-width="2.5"/>')

svg_parts.append('</svg>')

svg_content = '\n'.join(svg_parts)
with open('metro-map-v4.svg', 'w') as f:
    f.write(svg_content)

cairosvg.svg2png(bytestring=svg_content.encode(), write_to='metro-map-v4.png', output_width=1200, output_height=960)
print('Rendered metro-map-v4.png (1200x960)')
