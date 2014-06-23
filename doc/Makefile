
MARKDOWNPP=../../markdown-pp/markdown-pp.py
PANDOC=pandoc

default: SAGE2.docx

SAGE2.md: SAGE2.mdpp
	$(MARKDOWNPP) SAGE2.mdpp SAGE2.md

SAGE2.docx: SAGE2.md
	$(PANDOC) SAGE2.md -t docx -o SAGE2.docx

clean:
	/bin/rm -fr SAGE2.md SAGE2.docx
