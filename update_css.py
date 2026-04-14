import re

filename = 'c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/main.css'
with open(filename, 'r', encoding='utf-8') as f:
    css = f.read()

# Add @import if not present
if "@import 'fonts.css';" not in css:
    css = "@import 'fonts.css';\n" + css

# Semantic text changes
css = re.sub(
    r'--color-text:\s*var\(--white\);',
    '--color-text:       #F0F0F0;',
    css
)
css = re.sub(
    r'--color-text-muted:\s*var\(--gray\);',
    '--color-text-muted: #8A8A8A;',
    css
)
css = re.sub(
    r'--color-bg:\s*#0a0a0a;',
    '--color-bg:         #0A0A0A;',
    css
)
css = re.sub(
    r'--color-bg-card:\s*rgba\(255,255,255,0\.06\);',
    '--color-bg-card:    #1A1A1A;',
    css
)
css = re.sub(
    r'--color-border:\s*rgba\(255,255,255,0\.12\);',
    '--color-border:     #252525;\n  --color-border-high: #3A3A3A;',
    css
)

# Radius tokens
css = re.sub(
    r'--radius-sm:\s*8px;\n\s*--radius-md:\s*14px;\n\s*--radius-lg:\s*20px;\n\s*--radius-xl:\s*28px;\n\s*--radius-full:\s*9999px;',
    '--r-xs:       4px;\n  --r-sm:       8px;\n  --r-md:       14px;\n  --r-lg:       20px;\n  --r-xl:       26px;\n  --r-full:     9999px;',
    css
)
# Update references
css = css.replace('var(--radius-sm)', 'var(--r-sm)')
css = css.replace('var(--radius-md)', 'var(--r-md)')
css = css.replace('var(--radius-lg)', 'var(--r-lg)')
css = css.replace('var(--radius-xl)', 'var(--r-xl)')
css = css.replace('var(--radius-full)', 'var(--r-full)')

# Fonts
css = re.sub(
    r"--font-sans:\s*-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;",
    "--font-sans: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;\n  --font-heading: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;",
    css
)

# Light mode
css = re.sub(
    r'--color-bg:\s*#f5f5f7;',
    '--color-bg:       #FFFFFF;',
    css
)
css = re.sub(
    r'--color-bg-2:\s*#ebebeb;',
    '--color-bg-2:     #FAFAFA;',
    css
)
css = re.sub(
    r'--color-bg-card:\s*rgba\(0,0,0,0\.04\);',
    '--color-bg-card:  #F2F2F2;',
    css
)
css = re.sub(
    r'--color-border:\s*rgba\(0,0,0,0\.1\);',
    '--color-border:   #E8E8E8;\n  --color-border-high: #E0E0E0;',
    css
)
css = re.sub(
    r'--color-text:\s*#1a1a1a;',
    '--color-text:     #333333;',
    css
)
css = re.sub(
    r'--color-text-muted:\s*#555555;',
    '--color-text-muted: #757575;',
    css
)

# headings font family
css = re.sub(
    r'(h1, h2, h3, h4, h5, h6 \{[\s\S]*?)(\})',
    r'\1  font-family: var(--font-heading);\n\2',
    css,
    count=1
)

with open(filename, 'w', encoding='utf-8') as f:
    f.write(css)

print("Updated main.css successfully")
