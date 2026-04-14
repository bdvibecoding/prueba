import re
import os

files = [
    'c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/main.css',
    'c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/components.css',
    'c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/glassmorphism.css',
    'c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/animations.css'
]

replacements = [
    (r'var\(--radius-xs\)', 'var(--r-xs)'),
    (r'var\(--radius-sm\)', 'var(--r-sm)'),
    (r'var\(--radius-md\)', 'var(--r-md)'),
    (r'var\(--radius-lg\)', 'var(--r-lg)'),
    (r'var\(--radius-xl\)', 'var(--r-xl)'),
    (r'var\(--radius-full\)', 'var(--r-full)'),
]

# Specific Hierarchical Fixes
hierarchy_fixes = [
    # Badges/Labels -> r-xs (4px)
    (r'\.badge \{([\s\S]*?)border-radius: var\(--r-full\);', r'.badge {\1border-radius: var(--r-xs);'),
    (r'\.ba-label \{([\s\S]*?)border-radius: var\(--r-full\);', r'.ba-label {\1border-radius: var(--r-xs);'),
    
    # Inputs -> r-sm (8px)
    (r'\.input-group input,([\s\S]*?)border-radius: var\(--r-md\);', r'.input-group input,\1border-radius: var(--r-sm);'),
    (r'\.input-solo \{([\s\S]*?)border-radius: var\(--r-md\);', r'.input-solo {\1border-radius: var(--r-sm);'),
    (r'\.stripe-input \{([\s\S]*?)border-radius: var\(--r-sm\);', r'.stripe-input {\1border-radius: var(--r-sm);'), # Ensure consistent token
    (r'\.set-input \{([\s\S]*?)border-radius: var\(--r-sm\);', r'.set-input {\1border-radius: var(--r-sm);'),
    
    # Cards/Modales -> r-md (14px)
    (r'\.glass-card \{([\s\S]*?)border-radius: var\(--r-lg\);', r'.glass-card {\1border-radius: var(--r-md);'),
    (r'\.routine-card \{([\s\S]*?)border-radius: var\(--r-lg\);', r'.routine-card {\1border-radius: var(--r-md);'),
    (r'\.rest-timer-modal-card \{([\s\S]*?)border-radius: var\(--r-lg\);', r'.rest-timer-modal-card {\1border-radius: var(--r-md);'),
    (r'\.welcome-banner \{([\s\S]*?)border-radius: var\(--r-xl\);', r'.welcome-banner {\1border-radius: var(--r-md);'), # Mapping to cards/banners hierarchy
    (r'\.profile-subnav-card \{([\s\S]*?)border-radius: var\(--r-lg\);', r'.profile-subnav-card {\1border-radius: var(--r-md);'),
    
    # App Icons -> r-xl (26px)
    (r'\.app-icon-inner \{([\s\S]*?)border-radius: var\(--r-lg\);', r'.app-icon-inner {\1border-radius: var(--r-xl);'),
]

for file_path in files:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Apply mass variable replacements first
    for pattern, substitution in replacements:
        content = re.sub(pattern, substitution, content)
        
    # Apply specific hierarchy fixes
    for pattern, substitution in hierarchy_fixes:
        content = re.sub(pattern, substitution, content)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("done")
