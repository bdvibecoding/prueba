import re

# glassmorphism.css
with open('c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/glassmorphism.css', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('border-radius: 18px;', 'border-radius: var(--r-lg);')
text = text.replace('border-radius: 18px 18px 0 0;', 'border-radius: var(--r-lg) var(--r-lg) 0 0;')
text = text.replace('border-radius: 4px;', 'border-radius: var(--r-xs);')
text = text.replace('border-radius: 12px;', 'border-radius: var(--r-md);')
text = text.replace('border-radius: 8px;', 'border-radius: var(--r-sm);')
text = text.replace('border-radius: 16px;', 'border-radius: var(--r-md);')

with open('c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/glassmorphism.css', 'w', encoding='utf-8') as f:
    f.write(text)

# components.css
with open('c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/components.css', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('border-radius: 10px;', 'border-radius: var(--r-sm);')
text = text.replace('border-radius: 15px;', 'border-radius: var(--r-md);')

with open('c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/components.css', 'w', encoding='utf-8') as f:
    f.write(text)

# animations.css
with open('c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/animations.css', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('border-radius: 2px;', 'border-radius: var(--r-xs);')

with open('c:/Users/bigde/Desktop/Proyectos mix/TGWL/css/animations.css', 'w', encoding='utf-8') as f:
    f.write(text)

print("done")
