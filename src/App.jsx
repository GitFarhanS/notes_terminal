import React, { useState, useCallback, useRef } from 'react';
import CustomTerminal from './CustomTerminal';
import modules from './modules';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const BANNER = [
  "╔════════════════════════════════════════════════╗",
  "║            NOTES  TERMINAL                     ║",
  "║                                                ║",
  "║   Type 'help' for available commands           ║",
  "║   Type 'ls' to list contents                   ║",
  "╚════════════════════════════════════════════════╝",
  "",
];

const HELP_ROOT = [
  "",
  "  Commands:",
  "  ──────────────────────────────────────────────",
  "  ls                   List modules",
  "  cd <module>          Enter a module",
  "  clear                Clear terminal",
  "  help                 Show this help message",
  "",
];

const HELP_DIR = [
  "",
  "  Commands:",
  "  ──────────────────────────────────────────────",
  "  ls                   List contents",
  "  ls <category>        Filter notes by category",
  "  cd <dir>             Enter a subdirectory",
  "  cd ..                Go back one level",
  "  cat <id|name>        View a note",
  "  info <id|name>       Show note details",
  "  categories           Show all categories",
  "  search <term>        Search notes by keyword",
  "  clear                Clear terminal",
  "  help                 Show this help message",
  "",
];

function findNote(notesList, query) {
  const q = query.trim().toLowerCase();
  const byId = notesList.find((n) => String(n.id) === q);
  if (byId) return byId;
  return notesList.find(
    (n) =>
      n.name.toLowerCase() === q ||
      n.name.toLowerCase().replace(/_/g, ' ') === q ||
      n.title.toLowerCase() === q
  );
}

function formatNoteRow(note) {
  const id = String(note.id).padStart(2, ' ');
  const cat = note.category.padEnd(22, ' ');
  return `  [${id}]  ${cat} ${note.title}`;
}

function formatModuleRow(mod) {
  const noteCount = mod.directories
    ? mod.directories.reduce((sum, d) => sum + d.notes.length, 0)
    : mod.notes.length;
  const dirLabel = mod.directories
    ? `${mod.directories.length} dirs, `
    : '';
  return `  ${mod.id.padEnd(22)} ${dirLabel}${noteCount} notes`;
}

function formatDirRow(dir) {
  return `  ${dir.id.padEnd(22)} ${String(dir.notes.length).padStart(2, ' ')} notes   ${dir.name}`;
}

function getNotesAtPath(mod, subDir) {
  if (subDir) {
    const dir = mod.directories?.find(
      (d) => d.id.toLowerCase() === subDir.toLowerCase() || d.name.toLowerCase() === subDir.toLowerCase()
    );
    return dir ? dir.notes : null;
  }
  return mod.notes || null;
}

function getPdfBasePath(mod, subDir) {
  if (subDir) return `${mod.basePath}/${subDir}`;
  return mod.basePath;
}

function getAllNotes(mod) {
  if (mod.directories) {
    return mod.directories.flatMap((d) => d.notes);
  }
  return mod.notes || [];
}

export default function App() {
  const keyRef = useRef(0);
  const [lineData, setLineData] = useState(() =>
    BANNER.map((line) => {
      const k = keyRef.current++;
      return <div className="terminal-line" key={`k${k}`}>{line}</div>;
    })
  );
  const [activeNote, setActiveNote] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [activeSubDir, setActiveSubDir] = useState(null);

  const pushLines = useCallback((newLines) => {
    const elements = newLines.map((line) => {
      const k = keyRef.current++;
      return <div className="terminal-line" key={`k${k}`}>{line}</div>;
    });
    setLineData((prev) => [...prev, ...elements]);
  }, []);

  const promptLabel = activeModule
    ? activeSubDir
      ? `~/${activeModule.id}/${activeSubDir}$`
      : `~/${activeModule.id}$`
    : '~$';

  const handleInput = useCallback(
    (input) => {
      const trimmed = input.trim();
      const parts = trimmed.split(/\s+/);
      const cmd = parts[0]?.toLowerCase();
      const arg = parts.slice(1).join(' ');

      const prefix = activeModule
        ? activeSubDir
          ? `~/${activeModule.id}/${activeSubDir}`
          : `~/${activeModule.id}`
        : '~';
      pushLines([`${prefix} $ ${trimmed}`]);

      if (!cmd) return;

      if (cmd === 'clear') {
        setLineData([]);
        return;
      }

      // ─── ROOT LEVEL (no module selected) ───
      if (!activeModule) {
        switch (cmd) {
          case 'help': {
            pushLines(HELP_ROOT);
            break;
          }

          case 'ls': {
            pushLines([
              "",
              "  Modules:",
              "  ──────────────────────────────────────────────",
              ...modules.map(formatModuleRow),
              "",
              `  ${modules.length} module(s). Type 'cd <name>' to enter.`,
              "",
            ]);
            break;
          }

          case 'cd': {
            if (!arg) {
              pushLines(["  Usage: cd <module>", ""]);
              break;
            }
            if (arg === '..') {
              pushLines(["  Already at root.", ""]);
              break;
            }
            const q = arg.toLowerCase();
            const mod = modules.find(
              (m) => m.id.toLowerCase() === q || m.title.toLowerCase() === q
            );
            if (!mod) {
              pushLines([`  "${arg}" not found. Type 'ls' to see modules.`, ""]);
            } else {
              setActiveModule(mod);
              setActiveNote(null);
              setActiveSubDir(null);
              if (mod.directories) {
                pushLines([
                  "",
                  `  ${mod.title}`,
                  `  ${mod.description}`,
                  `  ${mod.directories.length} subdirectories. Type 'ls' to browse.`,
                  "",
                ]);
              } else {
                pushLines([
                  "",
                  `  ${mod.title}`,
                  `  ${mod.description}`,
                  `  ${mod.notes.length} note(s). Type 'ls' or 'help'.`,
                  "",
                ]);
              }
            }
            break;
          }

          default:
            pushLines([`  Unknown command: ${cmd}. Type 'help'.`, ""]);
        }
        return;
      }

      // ─── INSIDE A MODULE ───

      // cd command (works at both module and subdir level)
      if (cmd === 'cd') {
        if (!arg) {
          pushLines(["  Usage: cd <dir> or cd ..", ""]);
          return;
        }
        if (arg === '..') {
          if (activeSubDir) {
            setActiveSubDir(null);
            setActiveNote(null);
            pushLines([`  Back to ${activeModule.id}/`, ""]);
          } else {
            const name = activeModule.title;
            setActiveModule(null);
            setActiveNote(null);
            pushLines([`  Left ${name}`, ""]);
          }
          return;
        }
        if (!activeSubDir && activeModule.directories) {
          const q = arg.toLowerCase();
          const dir = activeModule.directories.find(
            (d) => d.id.toLowerCase() === q || d.name.toLowerCase() === q
          );
          if (!dir) {
            pushLines([`  "${arg}" not found. Type 'ls' to see directories.`, ""]);
          } else {
            setActiveSubDir(dir.id);
            setActiveNote(null);
            pushLines([
              "",
              `  ${dir.name} — ${dir.description}`,
              `  ${dir.notes.length} note(s). Type 'ls' or 'cat <id>'.`,
              "",
            ]);
          }
        } else {
          pushLines([`  "${arg}" is not a directory.`, ""]);
        }
        return;
      }

      // ls command
      if (cmd === 'ls') {
        if (!activeSubDir && activeModule.directories) {
          pushLines([
            "",
            `  ${activeModule.title}:`,
            "  ──────────────────────────────────────────────",
            ...activeModule.directories.map(formatDirRow),
            "",
            `  ${activeModule.directories.length} directories. Type 'cd <dir>' to enter.`,
            "",
          ]);
        } else {
          const notes = getNotesAtPath(activeModule, activeSubDir);
          if (!notes) {
            pushLines(["  No notes here.", ""]);
          } else if (arg) {
            const filtered = notes.filter(
              (n) => n.category.toLowerCase().includes(arg.toLowerCase())
            );
            if (filtered.length === 0) {
              pushLines([`  No notes in category "${arg}".`, ""]);
            } else {
              pushLines([
                "",
                `  Notes in "${arg}":`,
                "  ──────────────────────────────────────────────",
                ...filtered.map(formatNoteRow),
                "",
                `  ${filtered.length} note(s).`,
                "",
              ]);
            }
          } else {
            const label = activeSubDir
              ? activeModule.directories.find((d) => d.id === activeSubDir)?.name || activeSubDir
              : activeModule.title;
            pushLines([
              "",
              `  ${label} Notes:`,
              "  ──────────────────────────────────────────────",
              ...notes.map(formatNoteRow),
              "",
              `  ${notes.length} note(s). Type 'cat <id>' to view.`,
              "",
            ]);
          }
        }
        return;
      }

      // The remaining commands need a notes list
      const notes = getNotesAtPath(activeModule, activeSubDir);
      const hasNotes = notes && notes.length > 0;

      switch (cmd) {
        case 'help': {
          pushLines(HELP_DIR);
          break;
        }

        case 'cat': {
          if (!hasNotes) {
            pushLines(["  No notes at this level. cd into a subdirectory first.", ""]);
            break;
          }
          if (!arg) {
            pushLines(["  Usage: cat <id|name>", ""]);
            break;
          }
          const note = findNote(notes, arg);
          if (!note) {
            pushLines([`  "${arg}" not found. Type 'ls' to see notes.`, ""]);
          } else {
            const basePath = getPdfBasePath(activeModule, activeSubDir);
            setActiveNote({
              ...note,
              modulePath: basePath,
              moduleTitle: activeModule.title,
            });
            const lines = [
              "",
              `  ┌─ ${note.title} ─── [${note.category}]`,
              "  │",
            ];
            if (note.content && note.content.length > 0) {
              note.content.forEach((line) => {
                lines.push(`  │  ${line}`);
              });
              lines.push("  │");
            }
            lines.push(`  └─ PDF loaded in viewer`);
            lines.push("");
            pushLines(lines);
          }
          break;
        }

        case 'info': {
          if (!hasNotes) {
            pushLines(["  No notes at this level. cd into a subdirectory first.", ""]);
            break;
          }
          if (!arg) {
            pushLines(["  Usage: info <id|name>", ""]);
            break;
          }
          const note = findNote(notes, arg);
          if (!note) {
            pushLines([`  "${arg}" not found.`, ""]);
          } else {
            pushLines([
              "",
              `  Title:       ${note.title}`,
              `  ID:          ${note.id}`,
              `  Category:    ${note.category}`,
              `  Module:      ${activeModule.title}`,
              `  File:        ${note.file}`,
              `  Description: ${note.description}`,
              "",
            ]);
          }
          break;
        }

        case 'categories': {
          const allNotes = activeSubDir
            ? notes
            : getAllNotes(activeModule);
          if (!allNotes || allNotes.length === 0) {
            pushLines(["  No notes available.", ""]);
            break;
          }
          const cats = [...new Set(allNotes.map((n) => n.category))];
          pushLines([
            "",
            "  Categories:",
            "  ──────────────────────────────────────────────",
            ...cats.map((c) => {
              const count = allNotes.filter((n) => n.category === c).length;
              return `  • ${c} (${count})`;
            }),
            "",
          ]);
          break;
        }

        case 'search': {
          if (!arg) {
            pushLines(["  Usage: search <keyword>", ""]);
            break;
          }
          const allNotes = getAllNotes(activeModule);
          const q = arg.toLowerCase();
          const results = allNotes.filter(
            (n) =>
              n.title.toLowerCase().includes(q) ||
              n.description.toLowerCase().includes(q) ||
              n.category.toLowerCase().includes(q) ||
              n.name.toLowerCase().includes(q) ||
              (n.content && n.content.some((line) => line.toLowerCase().includes(q)))
          );
          if (results.length === 0) {
            pushLines([`  No results for "${arg}".`, ""]);
          } else {
            pushLines([
              "",
              `  Search results for "${arg}":`,
              "  ──────────────────────────────────────────────",
              ...results.map(formatNoteRow),
              "",
              `  ${results.length} result(s).`,
              "",
            ]);
          }
          break;
        }

        default:
          pushLines([`  Unknown command: ${cmd}. Type 'help'.`, ""]);
      }
    },
    [pushLines, activeModule, activeSubDir]
  );

  const getCompletions = useCallback((currentInput) => {
    const parts = currentInput.split(/\s+/);
    const cmd = parts[0]?.toLowerCase() || '';
    const arg = parts.slice(1).join(' ').toLowerCase();

    const rootCommands = ['help', 'ls', 'cd', 'clear'];
    const moduleCommands = ['help', 'ls', 'cd', 'cat', 'info', 'categories', 'search', 'clear'];

    if (parts.length <= 1) {
      const commands = activeModule ? moduleCommands : rootCommands;
      const matches = commands.filter((c) => c.startsWith(cmd));
      return matches.map((c) => c + ' ');
    }

    if (cmd === 'cd') {
      if (!activeModule) {
        const targets = modules.map((m) => m.id);
        const matches = targets.filter((t) => t.toLowerCase().startsWith(arg));
        return matches.map((t) => `cd ${t}`);
      } else if (!activeSubDir && activeModule.directories) {
        const targets = activeModule.directories.map((d) => d.id);
        const matches = targets.filter((t) => t.toLowerCase().startsWith(arg));
        return matches.map((t) => `cd ${t}`);
      }
    }

    if (cmd === 'cat' || cmd === 'info') {
      const notes = getNotesAtPath(activeModule, activeSubDir);
      if (notes) {
        const targets = notes.map((n) => n.name);
        const matches = targets.filter((t) => t.toLowerCase().startsWith(arg));
        return matches.map((t) => `${cmd} ${t}`);
      }
    }

    if (cmd === 'ls' && activeModule) {
      const notes = getNotesAtPath(activeModule, activeSubDir);
      if (notes) {
        const cats = [...new Set(notes.map((n) => n.category))];
        const matches = cats.filter((c) => c.toLowerCase().startsWith(arg));
        return matches.map((c) => `ls ${c}`);
      }
    }

    return [];
  }, [activeModule, activeSubDir]);

  const handleTerminalInput = useCallback((input, isTabHint) => {
    if (isTabHint) {
      const completions = getCompletions(input);
      if (completions.length > 1) {
        const items = completions.map((c) => {
          const parts = c.trim().split(/\s+/);
          return parts[parts.length - 1];
        });
        pushLines([`  ${items.join('   ')}`]);
      }
      return;
    }
    handleInput(input);
  }, [handleInput, getCompletions, pushLines]);

  const pdfSrc = activeNote
    ? `${BASE}${activeNote.modulePath}/${activeNote.file}`
    : null;

  return (
    <div className="app-container">
      <div className="terminal-panel">
        <CustomTerminal
          prompt={promptLabel}
          onInput={handleTerminalInput}
          getCompletions={getCompletions}
        >
          {lineData}
        </CustomTerminal>
      </div>

      <div className="viewer-panel">
        {activeNote ? (
          <>
            <div className="viewer-header">
              <h2>{activeNote.title}</h2>
              <span className="badge">{activeNote.moduleTitle}</span>
              <span className="badge">{activeNote.category}</span>
            </div>
            <div className="viewer-content">
              <iframe src={pdfSrc} title={activeNote.title} />
            </div>
          </>
        ) : (
          <div className="viewer-content">
            <div className="viewer-placeholder">
              <div className="icon">&#128218;</div>
              <p>
                No note selected.<br />
                Type <code>ls</code> to list modules,
                then <code>cd &lt;name&gt;</code> to enter one.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
