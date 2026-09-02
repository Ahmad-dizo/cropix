---
name: project-supervisor
description: 'Supervise your project health: identify unwanted files (debug, test, temp), validate required files exist, check code quality, and organize files. Creates archives of unused items. Use when: cleaning up project, organizing structure, validating setup, or removing clutter.'
argument-hint: 'Describe what you want to check or clean in your project'
---

# Project Supervisor

## Overview
This skill helps maintain a clean, well-organized project by identifying unwanted files, validating required components, and suggesting organizational improvements. Files marked for removal are archived in `.archive-unused/` for safe recovery.

## When to Use
- Starting a new session: "Supervise my project and show what needs cleaning"
- Before deployment: "Validate my project structure is ready"
- After development: "Find and archive any debug or test files"
- Code review: "Check code quality and suggest cleanup"
- Organizing: "Help me organize and structure my project files"

## Essential Files (Required for Project)
- `index.html` - Main entry point
- `plant_disease_model.keras` - Production ML model
- `requirements.txt` - Python dependencies
- `script.js` - Frontend JavaScript
- `styles.css` - Styling
- `server_py.py` OR `server_lite.py` - Backend server
- `.env` or `api.env` - Environment configuration
- `README.md` - Documentation

## Unwanted File Patterns (Candidates for Archiving)
- Debug files: `debug_*.py`, `hh.keras`, `test_*.py`
- Old/backup models: `old_*.keras`, `backup_*.keras`
- Test artifacts: `*.mp4` (test videos), `*.tmp`, `*.log`
- Duplicate servers: `server_lite.py` (if `server_py.py` is production)
- Temporary folders: Leftover test directories

## Supervised Project Checklist

### 1. **File Inventory** 
   - [ ] List all Python files and identify: production code vs. debug/test
   - [ ] List all model files (`.keras`) and identify: current vs. old/test
   - [ ] List large files/folders and verify they're needed (e.g., dataset, videos)
   - [ ] Check for duplicate functionality (e.g., multiple server files)

### 2. **Required Files Validation**
   - [ ] Verify all essential files listed in section above exist
   - [ ] Check that `.env` or `api.env` contains required keys
   - [ ] Confirm `requirements.txt` includes all import dependencies
   - [ ] Validate model files are accessible and not corrupted

### 3. **Code Quality Check**
   - [ ] Scan for unused imports in Python files
   - [ ] Check for hardcoded debug statements or test code
   - [ ] Look for TODO/FIXME comments indicating incomplete work
   - [ ] Verify no credentials exposed in source files

### 4. **Structure Validation**
   - [ ] Confirm `.github/` folder if using custom agent skills
   - [ ] Check dataset folder organization (if applicable)
   - [ ] Verify Docker files exist if containerizing
   - [ ] Validate README files are up-to-date

### 5. **Archive Unwanted Files**
   - [ ] Move debug files to `.archive-unused/`
   - [ ] Archive old model files to `.archive-unused/`
   - [ ] Move test artifacts to `.archive-unused/`
   - [ ] Archive duplicate/unused server files
   - [ ] Update `.archive-unused/README.md` with archive index

## Procedure

### Quick Audit (5 min)
1. List all files at project root
2. Flag obvious debug/test files (e.g., `debug_model.py`, `hh.keras`, `test.mp4`)
3. Verify essential files exist
4. Report findings with **actionable recommendations**

### Full Supervision (15-20 min)
1. **File Inventory**: Execute all items in Checklist Section 1
2. **Requirements Validation**: Execute all items in Checklist Section 2
3. **Code Quality**: Execute all items in Checklist Section 3
4. **Structure**: Execute all items in Checklist Section 4
5. **Archive Decision**: List files recommended for archival and ask for confirmation
6. **Archive Execution**: Move approved files to `.archive-unused/` and create manifest
7. **Summary Report**: Document changes and provide cleaning summary

### Selective Cleanup
- Ask user: "What category do you want me to focus on?" (debug files, old models, test artifacts, duplicates, unused code)
- Apply checklist items relevant to that category
- Present findings with specific file paths
- Request confirmation before archiving

## Output Format

Always provide clear, actionable reports:

```
🔍 PROJECT SUPERVISOR REPORT
=====================================

✅ ESSENTIAL FILES: All present
   ✓ index.html
   ✓ plant_disease_model.keras
   [...]

⚠️  ISSUES FOUND: 3 items
   • hh.keras (debug model - recommend archive)
   • test.mp4 (test artifact - recommend archive)
   • debug_model.py (debug code - recommend archive)

📋 DETAILED FINDINGS:
   [Organized by category with specific recommendations]

🗂️  ARCHIVING PLAN:
   Ready to move 3 items to `.archive-unused/`
   Confirm to proceed? [Y/N]
```

## Archive Management

### Create Archive Entry
When archiving a file, add an entry to `.archive-unused/README.md`:
```
| File | Date | Reason | Notes |
|------|------|--------|-------|
| hh.keras | 2026-04-10 | Debug model no longer needed | Can delete if unused after 30 days |
```

### Recovery
To restore from archive: "Restore [filename] from .archive-unused/"

---

## Related Tasks
- For model management: "Show me all model files and their sizes"
- For code organization: "Reorganize my Python files by function"
- For deployment: "Prepare project for deployment"
- For validation: "Test my project setup"
