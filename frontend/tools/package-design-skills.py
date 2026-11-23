from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

frontend = Path(__file__).resolve().parents[1]
source = frontend.parent / '.agents' / 'skills'
files = ('cmlia-visual-direction/SKILL.md', 'cmlia-motion-design/SKILL.md',
         'cmlia-motion-design/references/video-atlas.md', 'cmlia-visual-review/SKILL.md')
target = frontend / 'src' / 'assets' / 'cmlia-design-skills.zip'
target.parent.mkdir(exist_ok=True)
with ZipFile(target, 'w') as archive:
    for name in files:
        info = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        archive.writestr(info, (source / name).read_text(encoding='utf-8').encode(), ZIP_DEFLATED)
