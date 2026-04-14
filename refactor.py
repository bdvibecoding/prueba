import re

css_path = 'c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/components.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Replace .bottom-nav
css = re.sub(
    r'\.bottom-nav \{[\s\S]*?z-index: 100;\n\s*border-top: 1px solid var\(--glass-border\);\n\s*flex-shrink: 0;\n\}',
    '''.bottom-nav {
  position: fixed;
  bottom: 24px; left: 50%;
  transform: translateX(-50%);
  border-radius: var(--r-full);
  padding: 12px 24px;
  gap: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111111;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  z-index: 100;
  border: none;
}''',
    css, count=1
)

# Modify .nav-item
css = re.sub(
    r'\.nav-item \{[\s\S]*?position: relative;\n\}',
    '''.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
  -webkit-tap-highlight-color: transparent;
  position: relative;
  opacity: 0.4;
}''',
    css, count=1
)

css = re.sub(
    r'\.nav-item\.active \{ color: var\(--white\); \}',
    '''.nav-item.active { color: var(--white); opacity: 1; }
.nav-item.active::after {
  content: "";
  display: block;
  width: 4px; height: 4px;
  border-radius: 50%;
  background: #F0F0F0;
  position: absolute;
  bottom: -6px;
}''',
    css, count=1
)

# Hide labels
css = re.sub(
    r'\.nav-label \{ font-size: 10px; font-weight: 600; letter-spacing: 0\.02em; \}',
    '.nav-label { display: none !important; }',
    css, count=1
)

# Light mode bottom nav overrides
css = re.sub(
    r'body\.light-mode \.bottom-nav \{[\s\S]*?backdrop-filter: blur\(20px\);\n\}',
    '''body.light-mode .bottom-nav {
  background: #FFFFFF;
  border: 0.5px solid #E0E0E0;
}
body.light-mode .nav-item.active::after { background: #333333; }''',
    css, count=1
)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

# Remove top bar from index.html
html_path = 'c:/Users/bigde/Desktop/Proyectos mix/TGWL/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

html = re.sub(
    r'\s*<!-- Top Bar -->\s*<header class="top-bar glass-nav" id="top-bar">.*?</header>',
    '',
    html, flags=re.DOTALL
)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("success")
