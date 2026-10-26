"""Extract the unmodified Tamaulipas arms from the retained official law PDF."""
from pathlib import Path
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
source = root / 'scripts/flag-sources/mexico-laws/MX-TAM.pdf'
images = [image for image in PdfReader(source).pages[13].images
          if image.image.width > 500 and image.image.height > 500]
if len(images) != 1 or images[0].image.size != (1113, 1372):
    raise ValueError('The retained official law model changed; inspect page 14 before extracting.')
source.with_name('tamaulipas-2024-arms.png').write_bytes(images[0].data)
