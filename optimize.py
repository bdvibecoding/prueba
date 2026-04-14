import re

main_path = 'c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/main.css'
with open(main_path, 'r', encoding='utf-8') as f:
    main_css = f.read()

# Fix body and html to stop native bounce
main_css = re.sub(
    r'html \{([\s\S]*?)\}',
    r'html {\1\n  background-color: #000000;\n  height: 100dvh;\n}',
    main_css
)

main_css = re.sub(
    r'body \{([\s\S]*?)min-height: 100%;\n\s*overflow-x: hidden;([\s\S]*?)\}',
    r'body {\1height: 100dvh;\n  overflow: hidden;\n  overscroll-behavior-y: none;\2}',
    main_css
)

# .page-container safe area paddings + prevent bounce
main_css = re.sub(
    r'\.page-container \{([\s\S]*?)-webkit-overflow-scrolling: touch;\n([\s\S]*?)\}',
    r'.page-container {\1-webkit-overflow-scrolling: touch;\n  overscroll-behavior-y: contain;\n  padding-top: calc(var(--safe-top) + 24px);\n  padding-bottom: calc(var(--safe-bottom) + 120px);\n\2',
    main_css
)

# Ensure app-section spans properly to avoid white bottom strip
if 'height: 100dvh;' not in main_css and '.app-section {' in main_css:
    main_css = re.sub(
        r'\.app-section \{\n\s*position: fixed;\n\s*inset: 0;',
        r'.app-section {\n  position: fixed;\n  inset: 0;\n  height: 100dvh;\n  width: 100vw;',
        main_css
    )

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main_css)

comps_path = 'c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/components.css'
with open(comps_path, 'r', encoding='utf-8') as f:
    comps = f.read()

# Fix bottom nav safe area inset
comps = re.sub(
    r'bottom: 24px;\s*left: 50%;',
    r'bottom: calc(env(safe-area-inset-bottom, 0px) + 24px); left: 50%;',
    comps
)

with open(comps_path, 'w', encoding='utf-8') as f:
    f.write(comps)

# Update sw cache version to make sure it loads
sw_path = 'c:/Users/bigde/Desktop/Proyectos mix/TGWL/sw.js'
with open(sw_path, 'r', encoding='utf-8') as f:
    sw = f.read()
sw = re.sub(r'v6\.4', 'v6.5', sw)
with open(sw_path, 'w', encoding='utf-8') as f:
    f.write(sw)

print("done")
