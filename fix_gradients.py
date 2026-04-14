import re
import os

files = [
    'c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/main.css',
    'c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/components.css',
    'c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/glassmorphism.css',
    'c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/animations.css'
]

def fix_gradients(content):
    # 1. Remove Top Bar Title and Stat Value text gradients
    content = re.sub(
        r'(\.top-bar-title \{[\s\S]*?)background: linear-gradient\(.*?\);[\s\S]*?-webkit-background-clip: text;[\s\S]*?-webkit-text-fill-color: transparent;[\s\S]*?background-clip: text;',
        r'\1color: var(--white);', # Default to white for dark mode, will handle light mode separately
        content
    )
    content = re.sub(
        r'(\.stat-value \{[\s\S]*?)background: linear-gradient\(.*?\);[\s\S]*?-webkit-background-clip: text;[\s\S]*?-webkit-text-fill-color: transparent;[\s\S]*?background-clip: text;',
        r'\1color: var(--cyan);',
        content
    )
    
    # Light mode specific text gradient removals
    content = re.sub(
        r'body\.light-mode \.top-bar-title \{[\s\S]*?background: linear-gradient\(.*?\);[\s\S]*?-webkit-background-clip: text;[\s\S]*?-webkit-text-fill-color: transparent;[\s\S]*?background-clip: text;\s*\}',
        'body.light-mode .top-bar-title { color: #111111; }',
        content
    )
    content = re.sub(
        r'body\.light-mode \.stat-value \{[\s\S]*?background: linear-gradient\(.*?\);[\s\S]*?-webkit-background-clip: text;[\s\S]*?-webkit-text-fill-color: transparent;[\s\S]*?background-clip: text;\s*\}',
        'body.light-mode .stat-value { color: var(--red); }',
        content
    )

    # 2. Fix Button Primary (Functional background prohibited)
    # Change to solid and add subtle shimmer/top border if possible
    content = re.sub(
        r'(\.btn-primary \{[\s\S]*?)background: linear-gradient\(135deg, var\(--red-light\), var\(--red\)\);',
        r'\1background: var(--red);',
        content
    )
    
    # 3. Fix Button Accent/Danger (Subtle backgrounds)
    # 0.2/0.1 -> 0.12/0.05
    content = re.sub(
        r'background: linear-gradient\(135deg, rgba\(25,249,249,0.2\), rgba\(25,249,249,0.1\)\);',
        'background: linear-gradient(135deg, rgba(25,249,249,0.12), rgba(25,249,249,0.05));',
        content
    )
    content = re.sub(
        r'background: linear-gradient\(135deg, rgba\(239,68,68,0.2\), rgba\(239,68,68,0.1\)\);',
        'background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.05));',
        content
    )

    # 4. Fix Navigation (Nav item active)
    # 0.35/0.15 -> 0.15/0.05
    content = re.sub(
        r'(\.nav-item\.active \.nav-icon-wrap \{[\s\S]*?)background: linear-gradient\(135deg, rgba\(148,10,10,0.35\), rgba\(148,10,10,0.15\)\);',
        r'\1background: rgba(148,10,10,0.12);', # Use static subtle background for navigation as per rule
        content
    )

    # 5. Fix App Icons (Subtle decorative)
    # Pattern: linear-gradient(145deg, rgba(X,X,X,0.Y), rgba(X,X,X,0.Z))
    # Replace any high opacity with 15%/8%
    def replace_icon_gradient(match):
        prefix = match.group(1)
        r, g, b = match.group(2), match.group(3), match.group(4)
        return f'{prefix} background: linear-gradient(145deg, rgba({r},{g},{b},0.15), rgba({r},{g},{b},0.08));'
    
    content = re.sub(
        r'(\.icon-[a-z]+ +\{) background: linear-gradient\(145deg, rgba\((\d+),(\d+),(\d+),[\d.]+\), rgba\(\d+,\d+,\d+,[\d.]+\)\);',
        replace_icon_gradient,
        content
    )

    return content

for file_path in files:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = fix_gradients(content)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("done")
