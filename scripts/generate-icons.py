import zlib
import struct
import os

os.makedirs('icons', exist_ok=True)

def create_png(width, height, draw_func):
    """Generate RGBA PNG using standard library zlib and struct."""
    pixels = bytearray(width * height * 4)
    for y in range(height):
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            idx = (y * width + x) * 4
            pixels[idx] = max(0, min(255, int(r)))
            pixels[idx+1] = max(0, min(255, int(g)))
            pixels[idx+2] = max(0, min(255, int(b)))
            pixels[idx+3] = max(0, min(255, int(a)))
    
    # Pack into PNG scanlines with filter byte 0
    raw = bytearray()
    row_bytes = width * 4
    for y in range(height):
        raw.append(0)  # filter type None
        start = y * row_bytes
        raw.extend(pixels[start:start+row_bytes])
        
    def chunk(tag, data):
        return struct.pack('!I', len(data)) + tag + data + struct.pack('!I', zlib.crc32(tag + data) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('!IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

def draw_calendar_icon(x, y, w, h):
    # Normalized coords [0, 1]
    nx = x / float(w)
    ny = y / float(h)
    
    # Outer rounded box
    pad = 0.08
    radius = 0.22
    
    # Check if inside rounded rectangle
    cx = 0.5
    cy = 0.5
    half_w = 0.5 - pad
    half_h = 0.5 - pad
    
    dx = abs(nx - cx)
    dy = abs(ny - cy)
    
    in_box = False
    dist = 0
    corner_r = radius
    inner_w = half_w - corner_r
    inner_h = half_h - corner_r
    
    if dx <= inner_w and dy <= half_h:
        in_box = True
    elif dy <= inner_h and dx <= half_w:
        in_box = True
    elif dx > inner_w and dy > inner_h:
        cdx = dx - inner_w
        cdy = dy - inner_h
        dist = (cdx * cdx + cdy * cdy) ** 0.5
        in_box = (dist <= corner_r)
        
    if not in_box:
        # Subtle drop shadow or transparent
        return (0, 0, 0, 0)
        
    # Top header bar (Red / Blue Google-accent or sleek dark header)
    # Background: dark slate #1a1d24 (26, 29, 36)
    # Header bar: top 32% #4285F4 (66, 133, 244)
    if ny < 0.35:
        # Calendar top header with rings
        # Rings at x = 0.3 and x = 0.7
        is_ring = (abs(nx - 0.32) < 0.05 or abs(nx - 0.68) < 0.05) and ny < 0.18
        if is_ring:
            return (220, 225, 235, 255)
        return (66, 133, 244, 255)
        
    # Body background: deep dark #1e222b (30, 34, 43)
    # Calendar grid dots or date "24"
    # Small grid points
    grid_y = (ny - 0.38) / 0.5
    grid_x = (nx - 0.18) / 0.64
    
    # Inside calendar body
    base_color = (24, 27, 34, 255)
    
    if 0 <= grid_x <= 1 and 0 <= grid_y <= 1:
        gx = int(grid_x * 3)
        gy = int(grid_y * 2)
        cell_cx = (gx + 0.5) / 3.0
        cell_cy = (gy + 0.5) / 2.0
        
        c_dist = ((grid_x - cell_cx)**2 + (grid_y - cell_cy)**2)**0.5
        if c_dist < 0.1:
            if gx == 1 and gy == 0:
                # Active today dot - glowing blue/cyan
                return (56, 189, 248, 255)
            elif gx == 2 and gy == 1:
                # Emerald event dot
                return (52, 211, 153, 255)
            else:
                return (120, 135, 160, 220)
                
    return base_color

for size in [16, 48, 128]:
    png_data = create_png(size, size, draw_calendar_icon)
    with open(f'icons/icon-{size}.png', 'wb') as f:
        f.write(png_data)
    print(f'Generated icons/icon-{size}.png')
