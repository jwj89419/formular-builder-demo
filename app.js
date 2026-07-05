// Available fields schema
const SYSTEM_FIELDS = [
  { name: 'phone_number', type: 'string', desc: 'User phone number' },
  { name: 'email', type: 'string', desc: 'User email address' },
  { name: 'age', type: 'number', desc: 'Age of the user' },
  { name: 'is_active', type: 'boolean', desc: 'Is the user account active?' },
  { name: 'username', type: 'string', desc: 'Unique account username' },
  { name: 'score', type: 'number', desc: 'User rating score' },
  { name: 'has_premium', type: 'boolean', desc: 'Premium membership status' }
];

// Available functions
const FUNCTIONS = {
  length: { name: 'length', category: 'string', returnType: 'number', params: [{type: 'string', hint: 'text'}], desc: 'Returns the number of characters in a string.\nExample: length("abc") ➔ 3' },
  substring: { name: 'substring', category: 'string', returnType: 'string', params: [{type: 'string', hint: 'text'}, {type: 'number', hint: 'start'}, {type: 'number', hint: 'length'}], desc: 'Extracts a substring from text starting at the given position.\nExample: substring("hello", 1, 3) ➔ "ell"' },
  isnumeric: { name: 'isnumeric', category: 'utility', returnType: 'boolean', params: [{type: 'string', hint: 'text'}], desc: 'Checks if the text contains only numbers.\nExample: isnumeric("123") ➔ true' },
  contains_ANY: { name: 'contains_ANY', category: 'utility', returnType: 'boolean', params: [{type: 'string', hint: 'text'}, {type: 'string', hint: 'search_strs'}], desc: 'Checks if text contains the string (or ANY of multiple strings if separated by commas).\nExample: contains_ANY("hello", "a, e, i") ➔ true' },
  is_empty: { name: 'is_empty', category: 'utility', returnType: 'boolean', params: [{type: 'string', hint: 'text'}], desc: 'Checks if the text is empty or only whitespace.\nExample: is_empty("   ") ➔ true' }
};

// Application State
const state = {
  tokens: [],
  cursorIndex: 0,       // Insertion point (0 to tokens.length)
  focusedTokenId: null, // ID of selected token (non-input token)
  sandboxValues: {
    phone_number: '13812345678',
    email: 'hello@company.com',
    age: 26,
    is_active: true,
    username: 'frey_dev',
    score: 85,
    has_premium: false
  }
};

// Generate unique token IDs
function generateId() {
  return 'tok_' + Math.random().toString(36).substr(2, 9);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  renderFields();
  renderToolbox();
  renderFormula();
  renderSandboxInputs();
  validateAndEvaluate();

  // Search functionality for fields
  document.getElementById('field-search').addEventListener('input', (e) => {
    renderFields(e.target.value);
  });

  // Clear button
  document.getElementById('btn-clear').addEventListener('click', () => {
    state.tokens = [];
    state.cursorIndex = 0;
    state.focusedTokenId = null;
    renderFormula();
    validateAndEvaluate();
  });

  // Editor container focus/keyboard handling
  const container = document.getElementById('formula-editor-container');
  container.addEventListener('keydown', handleEditorKeyDown);

  // Click outside to deselect token focus
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.formula-editor-wrapper') && !e.target.closest('.toolbox-section')) {
      if (state.focusedTokenId) {
        state.focusedTokenId = null;
        renderFormula();
      }
    }
  });
});

// Render Fields in Sidebar
function renderFields(filter = '') {
  const container = document.getElementById('fields-container');
  container.innerHTML = '';

  const filtered = SYSTEM_FIELDS.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()));

  filtered.forEach(field => {
    const item = document.createElement('div');
    item.className = 'field-item';
    item.title = field.desc;
    item.innerHTML = `
      <span class="field-name"><i class="fa-solid fa-tag" style="opacity:0.6; margin-right:4px;"></i> ${field.name}</span>
      <span class="field-type ${field.type}">${field.type}</span>
    `;

    item.addEventListener('click', () => {
      insertToken({
        id: generateId(),
        type: 'field',
        value: field.name,
        dataType: field.type
      });
    });

    container.appendChild(item);
  });
}

// Render Functions & Operators Toolbox
function renderToolbox() {
  const stringFuncs = document.getElementById('string-functions');
  const utilityFuncs = document.getElementById('utility-functions');
  const compOps = document.getElementById('comparison-operators');
  const logOps = document.getElementById('logical-operators');

  // Clear previous
  stringFuncs.innerHTML = '';
  utilityFuncs.innerHTML = '';
  compOps.innerHTML = '';
  logOps.innerHTML = '';

  // Render Functions
  Object.values(FUNCTIONS).forEach(fn => {
    const btn = document.createElement('button');
    btn.className = 'tool-btn func-btn';
    btn.textContent = `${fn.name}()`;
    btn.dataset.func = fn.name;
    if (fn.desc) btn.title = fn.desc; // native tooltip

    btn.addEventListener('click', () => {
      insertFunctionTokens(fn.name);
    });

    if (fn.category === 'string') {
      stringFuncs.appendChild(btn);
    } else {
      utilityFuncs.appendChild(btn);
    }
  });

  // Operators Configuration
  const operators = [
    { value: '=', label: '=', cat: 'comp' },
    { value: '>', label: '>', cat: 'comp' },
    { value: '<', label: '<', cat: 'comp' },
    { value: '>=', label: '>=', cat: 'comp' },
    { value: '<=', label: '<=', cat: 'comp' },
    { value: '!=', label: '!=', cat: 'comp' },
    { value: 'AND', label: 'AND', cat: 'log' },
    { value: 'OR', label: 'OR', cat: 'log' },
    { value: 'NOT', label: 'NOT', cat: 'log' },
    { value: '(', label: '(', cat: 'log' },
    { value: ')', label: ')', cat: 'log' }
  ];

  operators.forEach(op => {
    const btn = document.createElement('button');
    btn.className = 'tool-btn op-btn';
    btn.textContent = op.label;
    btn.dataset.op = op.value; // Required for updateToolboxState to query and disable

    btn.addEventListener('click', () => {
      insertToken({
        id: generateId(),
        type: op.value === '(' || op.value === ')' ? 'bracket' : 'op',
        value: op.value
      });
    });

    if (op.cat === 'comp') {
      compOps.appendChild(btn);
    } else {
      logOps.appendChild(btn);
    }
  });
}

// Insert single token helper
function insertToken(token) {
  // If active insertion cursor is at a placeholder token, replace it!
  const currentToken = state.tokens[state.cursorIndex];
  const previousToken = state.tokens[state.cursorIndex - 1];

  if (previousToken && previousToken.type === 'placeholder') {
    state.tokens[state.cursorIndex - 1] = token;
    state.focusedTokenId = null;
  } else if (currentToken && currentToken.type === 'placeholder') {
    state.tokens[state.cursorIndex] = token;
    state.cursorIndex++;
    state.focusedTokenId = null;
  } else {
    // Normal insertion
    state.tokens.splice(state.cursorIndex, 0, token);
    state.cursorIndex++;
    state.focusedTokenId = null;
  }

  renderFormula();
  validateAndEvaluate();
}

// Insert complex function tokens template
function insertFunctionTokens(funcName) {
  const tokenTemplate = [];
  
  // Create function start token
  tokenTemplate.push({
    id: generateId(),
    type: 'func',
    value: `${funcName}(`,
    funcName: funcName
  });

  const fnConfig = FUNCTIONS[funcName];
  
  // Create arguments separated by commas
  fnConfig.params.forEach((paramConfig, idx) => {
    if (idx > 0) {
      tokenTemplate.push({
        id: generateId(),
        type: 'bracket',
        value: ','
      });
    }
    tokenTemplate.push({
      id: generateId(),
      type: 'placeholder',
      value: '',
      placeholderText: paramConfig.hint,
      paramType: paramConfig.type
    });
  });

  // End parenthesis
  tokenTemplate.push({
    id: generateId(),
    type: 'bracket',
    value: ')'
  });

  // Splice into token array
  const currentToken = state.tokens[state.cursorIndex];
  const previousToken = state.tokens[state.cursorIndex - 1];
  
  let targetIndex = state.cursorIndex;
  
  if (previousToken && previousToken.type === 'placeholder') {
    state.tokens.splice(state.cursorIndex - 1, 1, ...tokenTemplate);
    targetIndex = state.cursorIndex - 1 + 1; // place cursor on the first placeholder
  } else if (currentToken && currentToken.type === 'placeholder') {
    state.tokens.splice(state.cursorIndex, 1, ...tokenTemplate);
    targetIndex = state.cursorIndex + 1; // place cursor inside
  } else {
    state.tokens.splice(state.cursorIndex, 0, ...tokenTemplate);
    targetIndex = state.cursorIndex + 1; // place cursor inside
  }

  state.cursorIndex = targetIndex;
  state.focusedTokenId = null;
  
  renderFormula();
  validateAndEvaluate();

  // Focus the first placeholder input inside the newly inserted function
  setTimeout(() => {
    // First placeholder in template is always at index 1 (after the func-open token)
    const firstPlaceholder = tokenTemplate.find(t => t.type === 'placeholder');
    if (firstPlaceholder) {
      const input = document.querySelector(`.token[data-id="${firstPlaceholder.id}"] input`);
      if (input) {
        input.focus();
        input.select();
      }
    }
  }, 60);
}

// Render the Formula Workspace
function renderFormula() {
  const editor = document.getElementById('formula-editor');
  const container = document.getElementById('formula-editor-container');
  
  editor.innerHTML = '';

  if (state.tokens.length === 0) {
    container.classList.remove('has-tokens');
  } else {
    container.classList.add('has-tokens');
  }

  // Render each token and surrounding insertion cursor points
  for (let i = 0; i <= state.tokens.length; i++) {
    // Render insertion cursor
    const cursor = document.createElement('span');
    cursor.className = `insertion-point ${state.cursorIndex === i ? 'active' : ''}`;
    cursor.dataset.index = i;
    cursor.addEventListener('click', (e) => {
      e.stopPropagation();
      state.cursorIndex = i;
      state.focusedTokenId = null;
      renderFormula();
    });
    editor.appendChild(cursor);

    if (i < state.tokens.length) {
      const token = state.tokens[i];
      const pill = document.createElement('div');
      
      let typeClass = `token-${token.type}`;
      if (token.type === 'field' && token.dataType) {
        typeClass += ` field-${token.dataType === 'number' ? 'num' : token.dataType === 'boolean' ? 'bool' : 'str'}`;
      }

      pill.className = `token ${typeClass} ${state.focusedTokenId === token.id ? 'focused' : ''}`;
      pill.dataset.id = token.id;
      pill.tabIndex = 0;

      // Click to select/focus pill
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        state.focusedTokenId = token.id;
        state.cursorIndex = -1; // hide insertion cursors
        renderFormula();
      });

      // Drag and drop setup for fields
      pill.addEventListener('dragover', (e) => {
        e.preventDefault();
        pill.classList.add('drag-over');
      });
      pill.addEventListener('dragleave', () => {
        pill.classList.remove('drag-over');
      });
      pill.addEventListener('drop', (e) => {
        e.preventDefault();
        pill.classList.remove('drag-over');
        // Handle field dropping replacing placeholder
      });

      if (token.type === 'placeholder' || token.type === 'literal') {
        // Editable text input slot
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'token-input';
        input.value = token.value;
        input.placeholder = token.placeholderText || 'value';
        
        // Match width dynamically
        input.style.width = Math.max(30, (token.value.length + 1) * 8.5) + 'px';

        input.addEventListener('input', (e) => {
          token.value = e.target.value;
          if (token.value.length > 0) {
            token.type = 'literal';
          } else {
            token.type = 'placeholder';
          }
          input.style.width = Math.max(30, (token.value.length + 1) * 8.5) + 'px';
          renderFormulaPreview();   // ← keep preview in sync as user types
          validateAndEvaluate();
          updateToolboxState();
        });


        // Click focus inside input
        input.addEventListener('click', (e) => {
          e.stopPropagation();
          state.focusedTokenId = null;
          state.cursorIndex = i; // position cursor AT this placeholder (so sidebar clicks replace it)
          // Temporarily clean up sibling active cursors
          document.querySelectorAll('.insertion-point.active').forEach(c => c.classList.remove('active'));
        });

        input.addEventListener('focus', () => {
          updateToolboxState();
        });
        
        input.addEventListener('blur', () => {
          setTimeout(() => updateToolboxState(), 50);
        });

        // Key bindings inside inline input
        input.addEventListener('keydown', (e) => {
          const start = input.selectionStart;
          const end = input.selectionEnd;
          const len = input.value.length;

          if (e.key === 'Tab') {
            // Tab: jump to next placeholder (or prev with Shift+Tab)
            e.preventDefault();
            const dir = e.shiftKey ? -1 : 1;
            const placeholderIndices = state.tokens
              .map((t, idx) => ({ t, idx }))
              .filter(({ t }) => t.type === 'placeholder' || t.type === 'literal')
              .map(({ idx }) => idx);
            const myPos = placeholderIndices.indexOf(i);
            const nextPos = myPos + dir;
            if (nextPos >= 0 && nextPos < placeholderIndices.length) {
              const nextTokenId = state.tokens[placeholderIndices[nextPos]].id;
              const nextInput = document.querySelector(`.token[data-id="${nextTokenId}"] input`);
              if (nextInput) {
                nextInput.focus();
                nextInput.select();
              }
            } else {
              // Wrap to end of formula
              input.blur();
              state.cursorIndex = dir > 0 ? state.tokens.length : 0;
              renderFormula();
            }
          } else if (e.key === 'ArrowLeft' && start === 0 && end === 0) {
            // Exit left
            e.preventDefault();
            input.blur();
            state.cursorIndex = i;
            renderFormula();
          } else if (e.key === 'ArrowRight' && start === len && end === len) {
            // Exit right
            e.preventDefault();
            input.blur();
            state.cursorIndex = i + 1;
            renderFormula();
          } else if (e.key === 'Backspace' && len === 0) {
            // Delete empty token
            e.preventDefault();
            state.tokens.splice(i, 1);
            state.cursorIndex = i;
            renderFormula();
            validateAndEvaluate();
          }
        });

        pill.appendChild(input);
      } else {
        // Simple label pill
        const label = document.createElement('span');
        label.textContent = token.value;
        pill.appendChild(label);
      }

      // Small delete icon (exclude structural bracket tokens)
      if (token.type !== 'bracket') {
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'token-delete';
        deleteBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteTokenAt(i);
        });
        pill.appendChild(deleteBtn);
      }

      editor.appendChild(pill);
    }
  }

  updateToolboxState();
  renderFormulaPreview();
}

// Render a text-form preview of the current formula tokens.
// Reads live DOM input values so the preview is NEVER stale,
// even if the token closure references are slightly behind.
function renderFormulaPreview() {
  const previewEl = document.getElementById('formula-preview');
  if (!previewEl) return;

  if (state.tokens.length === 0) {
    previewEl.textContent = '';
    previewEl.style.display = 'none';
    return;
  }

  previewEl.style.display = 'block';

  const parts = state.tokens.map(tok => {
    if (tok.type === 'field') return tok.value;
    if (tok.type === 'func') return tok.funcName + '(';
    if (tok.type === 'op') return ` ${tok.value} `;
    if (tok.type === 'bracket') return tok.value === ',' ? ', ' : tok.value;

    if (tok.type === 'literal' || tok.type === 'placeholder') {
      // Always read from the live DOM input element — this is the source of truth
      const inputEl = document.querySelector(`.token[data-id="${tok.id}"] input`);
      const liveValue = inputEl ? inputEl.value : tok.value;
      if (!liveValue) return `‹${tok.placeholderText || 'value'}›`;
      return liveValue;
    }

    return tok.value;
  });

  previewEl.textContent = parts.join('');
}




// Delete token helper
function deleteTokenAt(index) {
  state.tokens.splice(index, 1);
  state.focusedTokenId = null;
  // Adjust cursor index
  if (state.cursorIndex > index) {
    state.cursorIndex--;
  }
  renderFormula();
  validateAndEvaluate();
}

// Handle Editor Keyboard Navigation & Deletions
function handleEditorKeyDown(e) {
  // ── Critical guard: if a token-input currently has focus, its own
  // keydown listener (attached in renderFormula) already handles ALL cases:
  //   • Normal chars  → browser appends to input value natively
  //   • Backspace     → browser deletes last char; only triggers token-delete when empty
  //   • ArrowLeft/Right at boundary → blurs input and moves cursor
  //   • Tab           → jumps to next placeholder
  // Without this guard, every keydown bubbles up here and causes double-handling
  // (Backspace deletes the preceding token, new chars spawn extra literal tokens).
  if (document.activeElement && document.activeElement.classList.contains('token-input')) {
    return;
  }

  // If focused on a pill (not inside input)
  if (state.focusedTokenId) {
    const idx = state.tokens.findIndex(t => t.id === state.focusedTokenId);

    if (idx === -1) return;

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      deleteTokenAt(idx);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (idx > 0) {
        const prev = state.tokens[idx - 1];
        if (prev.type === 'placeholder' || prev.type === 'literal') {
          // Focus input
          const input = document.querySelector(`.token[data-id="${prev.id}"] input`);
          if (input) {
            input.focus();
            state.focusedTokenId = null;
            state.cursorIndex = -1;
            renderFormula();
          }
        } else {
          state.focusedTokenId = prev.id;
          renderFormula();
        }
      } else {
        state.focusedTokenId = null;
        state.cursorIndex = 0;
        renderFormula();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (idx < state.tokens.length - 1) {
        const next = state.tokens[idx + 1];
        if (next.type === 'placeholder' || next.type === 'literal') {
          const input = document.querySelector(`.token[data-id="${next.id}"] input`);
          if (input) {
            input.focus();
            state.focusedTokenId = null;
            state.cursorIndex = -1;
            renderFormula();
          }
        } else {
          state.focusedTokenId = next.id;
          renderFormula();
        }
      } else {
        state.focusedTokenId = null;
        state.cursorIndex = state.tokens.length;
        renderFormula();
      }
    }
  } 
  // If editing cursor is active at insertion gaps
  else if (state.cursorIndex >= 0 && state.cursorIndex <= state.tokens.length) {
    if (e.key === 'Backspace') {
      if (state.cursorIndex > 0) {
        e.preventDefault();
        deleteTokenAt(state.cursorIndex - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      if (state.cursorIndex > 0) {
        e.preventDefault();
        const prev = state.tokens[state.cursorIndex - 1];
        if (prev.type === 'placeholder' || prev.type === 'literal') {
          const input = document.querySelector(`.token[data-id="${prev.id}"] input`);
          if (input) {
            input.focus();
            state.cursorIndex = -1;
            renderFormula();
          }
        } else {
          state.focusedTokenId = prev.id;
          state.cursorIndex = -1;
          renderFormula();
        }
      }
    } else if (e.key === 'ArrowRight') {
      if (state.cursorIndex < state.tokens.length) {
        e.preventDefault();
        const next = state.tokens[state.cursorIndex];
        if (next.type === 'placeholder' || next.type === 'literal') {
          const input = document.querySelector(`.token[data-id="${next.id}"] input`);
          if (input) {
            input.focus();
            state.cursorIndex = -1;
            renderFormula();
          }
        } else {
          state.focusedTokenId = next.id;
          state.cursorIndex = -1;
          renderFormula();
        }
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // ── Printable character typed while cursor is active ──
      // Guard: if focus is already inside a literal/placeholder input, let the
      // browser handle it normally — do NOT intercept or it spawns a new token
      // for every subsequent keystroke (the "11 → two tokens" bug).
      if (document.activeElement && document.activeElement.classList.contains('token-input')) {
        return;
      }

      // Auto-create a literal token so the user can type values (numbers, strings)
      // directly after operators like = > < without clicking the sidebar.
      e.preventDefault();
      const newLiteral = {
        id: generateId(),
        type: 'literal',
        value: e.key,
        placeholderText: 'value'
      };
      state.tokens.splice(state.cursorIndex, 0, newLiteral);
      state.cursorIndex++;
      renderFormula();
      validateAndEvaluate();

      // Focus the new literal input and move cursor to end
      setTimeout(() => {
        const input = document.querySelector(`.token[data-id="${newLiteral.id}"] input`);
        if (input) {
          input.focus();
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }
      }, 30);
    }

  }
}


// Determine the context mode and type of the expression preceding the cursor/focus
function getContextAnalysis() {
  const activeInput = document.activeElement;
  if (activeInput && activeInput.classList.contains('token-input')) {
    const tokenPill = activeInput.closest('.token');
    if (tokenPill) {
      const id = tokenPill.dataset.id;
      const t = state.tokens.find(tok => tok.id === id);
      if (t && t.type === 'placeholder' && t.paramType) {
        return { mode: 'expected', type: t.paramType };
      }
    }
  }

  let targetTok = null;
  let targetIdx = -1;

  if (state.focusedTokenId) {
    targetIdx = state.tokens.findIndex(t => t.id === state.focusedTokenId);
    if (targetIdx >= 0) targetTok = state.tokens[targetIdx];
  } else if (state.cursorIndex > 0) {
    targetIdx = state.cursorIndex - 1;
    targetTok = state.tokens[targetIdx];
  }

  if (!targetTok) return { mode: 'empty', type: null };

  if (targetTok.type === 'field') return { mode: 'supplied', type: targetTok.dataType };
  if (targetTok.type === 'literal') {
    if (/^(true|false)$/i.test(targetTok.value)) return { mode: 'supplied', type: 'boolean' };
    if (/^-?\d+(\.\d+)?$/.test(targetTok.value)) return { mode: 'supplied', type: 'number' };
    return { mode: 'supplied', type: 'string' };
  }
  if (targetTok.type === 'func') {
    const fnDef = FUNCTIONS[targetTok.value] || FUNCTIONS[targetTok.funcName];
    return { mode: 'supplied', type: fnDef ? fnDef.returnType : 'unknown' };
  }
  if (targetTok.type === 'bracket' && targetTok.value === ')') {
    let depth = 0;
    for (let i = targetIdx; i >= 0; i--) {
      const t = state.tokens[i];
      if (t.type === 'bracket' && t.value === ')') depth++;
      else if (t.type === 'bracket' && t.value === '(') {
        depth--;
        if (depth === 0) {
          const fnTok = state.tokens[i - 1];
          if (fnTok && fnTok.type === 'func') {
            const fnDef = FUNCTIONS[fnTok.funcName || fnTok.value];
            return { mode: 'supplied', type: fnDef ? fnDef.returnType : 'unknown' };
          }
          return { mode: 'supplied', type: 'unknown' };
        }
      }
    }
  }

  if (targetTok.type === 'op' || (targetTok.type === 'bracket' && targetTok.value === '(') || (targetTok.type === 'bracket' && targetTok.value === ',')) {
    return { mode: 'operator', type: null };
  }

  return { mode: 'unknown', type: null };
}

// Update the enabled/disabled state of buttons in the sidebar toolbox
function updateToolboxState() {
  const ctx = getContextAnalysis();

  // Operators
  const allOps = ['=', '!=', '>', '<', '>=', '<=', 'AND', 'OR', 'NOT', '(', ')'];
  allOps.forEach(op => {
    const btn = document.querySelector(`.tool-btn[data-op="${op}"]`);
    if (!btn) return;

    if (ctx.mode === 'expected') {
      btn.disabled = true;
      btn.title = `Operators cannot be inserted directly into a parameter placeholder`;
    } else if (ctx.mode === 'supplied') {
      if (ctx.type === 'boolean' && ['>', '<', '>=', '<='].includes(op)) {
        btn.disabled = true;
        btn.title = `Operator '${op}' cannot be used after a Boolean`;
      } else if (op === 'NOT' || op === '(') {
        btn.disabled = true;
        btn.title = `'${op}' cannot directly follow a value`;
      } else {
        btn.disabled = false;
        btn.title = `Insert ${op}`;
      }
    } else if (ctx.mode === 'operator' || ctx.mode === 'empty') {
      if (['=', '!=', '>', '<', '>=', '<=', 'AND', 'OR', ')'].includes(op)) {
        btn.disabled = true;
        btn.title = `Operator '${op}' requires a preceding value`;
      } else {
        btn.disabled = false;
        btn.title = `Insert ${op}`;
      }
    } else {
      btn.disabled = false;
    }
  });

  // Functions
  Object.keys(FUNCTIONS).forEach(fnName => {
    const btn = document.querySelector(`.tool-btn[data-func="${fnName}"]`);
    if (!btn) return;
    const fnDef = FUNCTIONS[fnName];

    if (ctx.mode === 'expected') {
      if (fnDef.returnType !== ctx.type) {
        btn.disabled = true;
        btn.title = `Placeholder expects ${ctx.type}, but ${fnName}() returns ${fnDef.returnType}`;
      } else {
        btn.disabled = false;
        btn.title = fnDef.desc || `Insert ${fnName}()`;
      }
    } else if (ctx.mode === 'supplied') {
      btn.disabled = true;
      btn.title = `Cannot insert a function directly after a value. Insert an operator first.`;
    } else {
      btn.disabled = false;
      btn.title = fnDef.desc || `Insert ${fnName}()`;
    }
  });
}

// -----------------------------------------------------------------------------
// AST PARSER & TYPE VALIDATION
// -----------------------------------------------------------------------------

class ASTNode {
  getType() { return 'unknown'; }
  evaluate(context) { return null; }
}

class FieldNode extends ASTNode {
  constructor(name, dataType) {
    super();
    this.name = name;
    this.dataType = dataType;
  }
  getType() { return this.dataType; }
  evaluate(context) {
    return context[this.name] !== undefined ? context[this.name] : null;
  }
}

class LiteralNode extends ASTNode {
  constructor(rawValue) {
    super();
    this.rawValue = rawValue.trim();
  }
  getType() {
    if (/^(true|false)$/i.test(this.rawValue)) return 'boolean';
    if (/^-?\d+(\.\d+)?$/.test(this.rawValue)) return 'number';
    
    // Strict Quote Validation
    const s = this.rawValue;
    if (s.length > 0) {
      const quotePairs = { '"': '"', "'": "'", "“": "”", "‘": "’" };
      const firstChar = s[0];
      const lastChar = s[s.length - 1];
      
      const isFirstQuote = !!quotePairs[firstChar];
      const allClosingQuotes = Object.values(quotePairs);
      const isLastQuote = allClosingQuotes.includes(lastChar) || Object.keys(quotePairs).includes(lastChar);
      
      if ((isFirstQuote && !isLastQuote) || (!isFirstQuote && isLastQuote) || (isFirstQuote && isLastQuote && s.length === 1) || (isFirstQuote && isLastQuote && quotePairs[firstChar] !== lastChar)) {
        throw new Error(`Syntax Error: Unbalanced quotes in literal [ ${s} ]`);
      }
    }
    
    return 'string';
  }
  evaluate() {
    const type = this.getType();
    if (type === 'boolean') return this.rawValue.toLowerCase() === 'true';
    if (type === 'number') return parseFloat(this.rawValue);

    // If it starts with a quote, it has already been validated to be a perfectly matching pair
    const quotePairs = { '"': '"', "'": "'", "“": "”", "‘": "’" };
    if (this.rawValue.length >= 2 && !!quotePairs[this.rawValue[0]]) {
      return this.rawValue.slice(1, -1);
    }
    return this.rawValue;
  }
}

class FunctionNode extends ASTNode {
  constructor(name, args) {
    super();
    this.name = name;
    this.args = args; // array of ASTNodes
  }
  getType() {
    const fn = FUNCTIONS[this.name];
    return fn ? fn.returnType : 'unknown';
  }
  evaluate(context) {
    const evalArgs = this.args.map(arg => arg.evaluate(context));
    
    switch (this.name) {
      case 'length':
        return typeof evalArgs[0] === 'string' ? evalArgs[0].length : 0;
      case 'substring': {
        const str = String(evalArgs[0] || '');
        const start = Number(evalArgs[1]) || 0;
        const len = Number(evalArgs[2]) || 0;
        return str.substr(start, len);
      }
      case 'isnumeric':
        return /^\d+$/.test(String(evalArgs[0] || ''));
      case 'contains_ANY': {
        const text = String(evalArgs[0] || '');
        const searchStr = String(evalArgs[1] || '');
        // Support multiple comma-separated strings (matches ANY of them)
        // Split by standard comma, fullwidth comma， or enumeration comma、
        const items = searchStr.split(/[,，、|]/).map(s => s.trim()).filter(Boolean);
        if (items.length === 0) return false;
        return items.some(item => text.includes(item));
      }
      case 'is_empty': {
        const v = evalArgs[0];
        return v === null || v === undefined || String(v).trim() === '';
      }
      default:
        return null;
    }
  }
}

class BinaryNode extends ASTNode {
  constructor(op, left, right) {
    super();
    this.op = op;
    this.left = left;
    this.right = right;
  }
  getType() {
    return 'boolean'; // All binary comparisons and logical operations output Boolean
  }
  evaluate(context) {
    const lVal = this.left.evaluate(context);
    const rVal = this.right.evaluate(context);

    switch (this.op) {
      case '=': {
        // Smart coercion: if one side is string and other is number,
        // stringify the number so e.g. substring()='1' works when user types 1
        if (typeof lVal === 'string' && typeof rVal === 'number') return lVal === String(rVal);
        if (typeof lVal === 'number' && typeof rVal === 'string') return String(lVal) === rVal;
        return lVal === rVal;
      }
      case '!=': {
        if (typeof lVal === 'string' && typeof rVal === 'number') return lVal !== String(rVal);
        if (typeof lVal === 'number' && typeof rVal === 'string') return String(lVal) !== rVal;
        return lVal !== rVal;
      }
      case '>': return lVal > rVal;
      case '<': return lVal < rVal;
      case '>=': return lVal >= rVal;
      case '<=': return lVal <= rVal;
      case 'AND': return Boolean(lVal) && Boolean(rVal);
      case 'OR': return Boolean(lVal) || Boolean(rVal);
      default: return null;
    }
  }
}

class UnaryNode extends ASTNode {
  constructor(op, value) {
    super();
    this.op = op;
    this.value = value;
  }
  getType() { return 'boolean'; }
  evaluate(context) {
    const val = this.value.evaluate(context);
    if (this.op === 'NOT') {
      return !val;
    }
    return null;
  }
}

// Convert token list into matching parentheses structure
function nestTokens(tokens) {
  let idx = 0;

  function parseGroup(endChar = null) {
    const list = [];
    while (idx < tokens.length) {
      const tok = tokens[idx];

      if (tok.value === ')' && endChar === ')') {
        idx++; // consume ')'
        return list;
      }

      if (tok.type === 'bracket' && tok.value === ',') {
        // Return comma as a token, let recursive parser handle comma split
        list.push(tok);
        idx++;
        continue;
      }

      if (tok.type === 'func') {
        const fnName = tok.funcName;
        idx++; // consume function start 'name('
        const innerList = parseGroup(')');
        list.push({
          type: 'nested-func',
          name: fnName,
          children: innerList,
          originalToken: tok
        });
        continue;
      }

      if (tok.type === 'bracket' && tok.value === '(') {
        idx++; // consume '('
        const innerList = parseGroup(')');
        list.push({
          type: 'nested-group',
          children: innerList,
          originalToken: tok
        });
        continue;
      }

      if (tok.type === 'bracket' && tok.value === ')') {
        throw new Error("Mismatched Bracket: Found closing ')' without opening parenthesis.");
      }

      // Add other tokens directly
      list.push(tok);
      idx++;
    }

    if (endChar) {
      throw new Error(`Mismatched Parentheses: Missing closing '${endChar}'`);
    }

    return list;
  }

  return parseGroup();
}

// Parses nested tokens into AST
// Precedence: OR < AND < NOT < COMPARISONS (=, >, <, etc.)
function parseExpression(nodes) {
  if (nodes.length === 0) return null;

  // Split by OR
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].type === 'op' && nodes[i].value === 'OR') {
      const left = parseExpression(nodes.slice(0, i));
      const right = parseExpression(nodes.slice(i + 1));
      if (!left || !right) throw new Error("Syntax Error: Operator 'OR' expects left and right expressions.");
      return new BinaryNode('OR', left, right);
    }
  }

  // Split by AND
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].type === 'op' && nodes[i].value === 'AND') {
      const left = parseExpression(nodes.slice(0, i));
      const right = parseExpression(nodes.slice(i + 1));
      if (!left || !right) throw new Error("Syntax Error: Operator 'AND' expects left and right expressions.");
      return new BinaryNode('AND', left, right);
    }
  }

  // NOT unary operator
  if (nodes[0].type === 'op' && nodes[0].value === 'NOT') {
    const value = parseExpression(nodes.slice(1));
    if (!value) throw new Error("Syntax Error: Operator 'NOT' expects an expression.");
    return new UnaryNode('NOT', value);
  }

  // Split by Comparisons (=, !=, >, <, >=, <=)
  const compOps = ['=', '!=', '>', '<', '>=', '<='];
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].type === 'op' && compOps.includes(nodes[i].value)) {
      const left = parseExpression(nodes.slice(0, i));
      const right = parseExpression(nodes.slice(i + 1));
      if (!left || !right) throw new Error(`Syntax Error: Operator '${nodes[i].value}' expects left and right expressions.`);
      return new BinaryNode(nodes[i].value, left, right);
    }
  }

  // Base elements
  if (nodes.length === 1) {
    const node = nodes[0];
    
    if (node.type === 'nested-group') {
      return parseExpression(node.children);
    }

    if (node.type === 'nested-func') {
      // Split args by comma ','
      const argsNodes = [];
      let currentArg = [];
      
      node.children.forEach(child => {
        if (child.type === 'bracket' && child.value === ',') {
          argsNodes.push(currentArg);
          currentArg = [];
        } else {
          currentArg.push(child);
        }
      });
      argsNodes.push(currentArg);

      const parsedArgs = argsNodes.map(argList => {
        const argNode = parseExpression(argList);
        if (!argNode) {
          throw new Error(`Argument Error: Missing parameter inside function '${node.name}()'.`);
        }
        return argNode;
      });

      // Validate parameter count
      const fnDef = FUNCTIONS[node.name];
      if (fnDef.params.length !== parsedArgs.length) {
        throw new Error(`Argument Count Mismatch: Function '${node.name}()' expects ${fnDef.params.length} arguments, but received ${parsedArgs.length}.`);
      }

      return new FunctionNode(node.name, parsedArgs);
    }

    if (node.type === 'field') {
      return new FieldNode(node.value, node.dataType);
    }

    if (node.type === 'literal') {
      return new LiteralNode(node.value);
    }

    if (node.type === 'placeholder') {
      throw new Error(`Empty Parameter: Please fill all placeholder slots in the formula.`);
    }
  }

  // If we ended up here and have multiple nodes without operator splitting, it is a syntax error
  if (nodes.length > 1) {
    // Provide a smart tip if we see two adjacent variables/literals (like "phone_number 11")
    const names = nodes.map(n => n.value || (n.type === 'nested-func' ? `${n.name}()` : 'expr')).join(' ');
    throw new Error(`Syntax Error: Missing operator between values near: "${names}".`);
  }

  return null;
}

// Perform type verification on AST nodes
function verifyTypes(ast) {
  if (!ast) return;

  // Unary check
  if (ast instanceof UnaryNode) {
    verifyTypes(ast.value);
    const innerType = ast.value.getType();
    if (innerType !== 'boolean') {
      throw new Error(`Type Mismatch: Operator 'NOT' expects Boolean, but received ${capitalize(innerType)}.`);
    }
  }

  // Binary check
  else if (ast instanceof BinaryNode) {
    verifyTypes(ast.left);
    verifyTypes(ast.right);

    const leftType = ast.left.getType();
    const rightType = ast.right.getType();

    if (ast.op === 'AND' || ast.op === 'OR') {
      if (leftType !== 'boolean') {
        throw new Error(`Type Mismatch: Left side of '${ast.op}' must be Boolean, but received ${capitalize(leftType)}.`);
      }
      if (rightType !== 'boolean') {
        throw new Error(`Type Mismatch: Right side of '${ast.op}' must be Boolean, but received ${capitalize(rightType)}.`);
      }
    } else {
      // Comparison operator (=, !=, >, <, etc.)
      if (leftType !== rightType) {
        // Smart hint for phone_number = 11 instead of length(phone_number) = 11
        if (ast.left instanceof FieldNode && leftType === 'string' && rightType === 'number') {
          throw new Error(`Type Mismatch: Comparing Field '${ast.left.name}' (String) with Number. <br><i class="fa-solid fa-lightbulb" style="color:var(--warning);"></i> <b>Suggestion:</b> Use <code>length(${ast.left.name}) ${ast.op} ${ast.right.evaluate()}</code> to check length!`);
        }
        
        throw new Error(`Type Mismatch: Cannot compare ${capitalize(leftType)} to ${capitalize(rightType)} using operator '${ast.op}'.`);
      }

      // Greater than, less than are not logically valid on booleans
      if (['>', '<', '>=', '<='].includes(ast.op) && leftType === 'boolean') {
        throw new Error(`Type Mismatch: Comparison operator '${ast.op}' is invalid for Boolean values.`);
      }
    }
  }

  // Function checks
  else if (ast instanceof FunctionNode) {
    const fnDef = FUNCTIONS[ast.name];
    ast.args.forEach((arg, idx) => {
      verifyTypes(arg);
      const expectedType = fnDef.params[idx].type;
      const actualType = arg.getType();

      if (expectedType !== actualType) {
        // Special case: isnumeric() applied to a Boolean field (e.g. isnumeric(is_active))
        if (ast.name === 'isnumeric' && actualType === 'boolean') {
          const argName = arg instanceof FieldNode ? `'${arg.name}'` : 'argument';
          throw new Error(`Type Mismatch: Function 'isnumeric()' expects String, but received Boolean ${argName}.`);
        }
        throw new Error(`Type Mismatch: Function '${ast.name}()' argument ${idx + 1} expects ${capitalize(expectedType)}, but received ${capitalize(actualType)}.`);
      }
    });
  }
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Main verification and evaluation pipeline
// Sync all literal/placeholder token values from their live DOM inputs.
// This ensures that state.tokens always reflects what is actually shown
// in the editor inputs before any validation or evaluation runs.
function syncTokenValuesFromDOM() {
  state.tokens.forEach(tok => {
    if (tok.type === 'literal' || tok.type === 'placeholder') {
      const inputEl = document.querySelector(`.token[data-id="${tok.id}"] input`);
      if (inputEl) {
        tok.value = inputEl.value;
        tok.type = tok.value.length > 0 ? 'literal' : 'placeholder';
      }
    }
  });
}

function validateAndEvaluate() {
  // Always sync DOM → state before validating so AST uses current input values
  syncTokenValuesFromDOM();

  const statusBox = document.getElementById('validation-status-box');
  const evalResultBox = document.getElementById('evaluation-result-box');

  if (state.tokens.length === 0) {
    statusBox.className = 'validation-status-box empty';
    statusBox.innerHTML = `
      <span class="status-icon"><i class="fa-solid fa-circle-info"></i></span>
      <div class="status-details">
        <h5>Empty Formula</h5>
        <p>Start clicking left sidebar buttons to build validation logic.</p>
      </div>
    `;
    evalResultBox.className = 'evaluation-result-box';
    evalResultBox.innerHTML = `
      <div class="eval-status-placeholder">
        <i class="fa-solid fa-hourglass-start"></i> Write a valid formula to see execution result
      </div>
    `;
    return;
  }

  try {
    // 1. Nest bracket/functions
    const nested = nestTokens(state.tokens);

    // 2. Parse into AST
    const ast = parseExpression(nested);
    
    if (!ast) {
      throw new Error("Syntax Error: Incomplete formula structure.");
    }

    // 3. Type check
    verifyTypes(ast);

    // If validation passes, show success message
    statusBox.className = 'validation-status-box valid';
    statusBox.innerHTML = `
      <span class="status-icon"><i class="fa-solid fa-circle-check"></i></span>
      <div class="status-details">
        <h5>Formula Syntax & Types Valid</h5>
        <p>The parser built a secure AST successfully with proper type matching.</p>
      </div>
    `;

    // 4. Evaluate formula in Sandbox
    const result = ast.evaluate(state.sandboxValues);
    
    // The main rule must return Boolean for fields validation!
    const returnType = ast.getType();
    if (returnType !== 'boolean') {
      statusBox.className = 'validation-status-box invalid';
      statusBox.innerHTML = `
        <span class="status-icon"><i class="fa-solid fa-circle-exclamation"></i></span>
        <div class="status-details">
          <h5>Validation Rule Mismatch</h5>
          <p>A field validation formula must evaluate to a <b>Boolean</b> (True/False). Current formula returns <b>${capitalize(returnType)}</b>.</p>
        </div>
      `;
      evalResultBox.className = 'evaluation-result-box';
      evalResultBox.innerHTML = `
        <div class="eval-status-placeholder">
          <i class="fa-solid fa-circle-exclamation" style="color:var(--danger);"></i> Validation rule must return Boolean
        </div>
      `;
      return;
    }

    if (result === true) {
      evalResultBox.className = 'evaluation-result-box pass animate-pass';
      evalResultBox.innerHTML = `
        <div class="eval-result-content">
          <span class="eval-result-icon"><i class="fa-solid fa-circle-check"></i></span>
          <div class="eval-result-title">PASSED (TRUE)</div>
          <div class="eval-result-desc">Mock inputs satisfied the validation rule constraints.</div>
        </div>
      `;
    } else {
      // Debug: try to extract left/right values for display
      let debugInfo = '';
      try {
        if (ast.left && ast.right) {
          const lVal = ast.left.evaluate(state.sandboxValues);
          const rVal = ast.right.evaluate(state.sandboxValues);
          const lDbg = lVal !== null ? lVal : 'null';
          const rDbg = rVal !== null ? rVal : 'null';
          const lType = lVal !== null ? typeof lVal : 'unknown';
          const rType = rVal !== null ? typeof rVal : 'unknown';
          debugInfo = `<div class="eval-debug-info">Left: <b>${JSON.stringify(lDbg)}</b> (${lType}) &nbsp;|&nbsp; Right: <b>${JSON.stringify(rDbg)}</b> (${rType})</div>`;
        } else if (ast instanceof FunctionNode) {
          const evalArgs = ast.args.map(arg => arg.evaluate(state.sandboxValues));
          const argsDbg = evalArgs.map(v => JSON.stringify(v !== null ? v : 'null')).join(', ');
          debugInfo = `<div class="eval-debug-info">Function Args: <b>[${argsDbg}]</b></div>`;
        }
      } catch(e) {}

      evalResultBox.className = 'evaluation-result-box fail animate-fail';
      evalResultBox.innerHTML = `
        <div class="eval-result-content">
          <span class="eval-result-icon"><i class="fa-solid fa-circle-xmark"></i></span>
          <div class="eval-result-details" style="display:flex;flex-direction:column;gap:0.25rem;">
            <div class="eval-result-title">FAILED (FALSE)</div>
            <div class="eval-result-desc">Mock inputs violated the validation rule constraints.</div>
            ${debugInfo}
          </div>
        </div>
      `;
    }


  } catch (err) {
    statusBox.className = 'validation-status-box invalid';
    statusBox.innerHTML = `
      <span class="status-icon"><i class="fa-solid fa-triangle-exclamation"></i></span>
      <div class="status-details">
        <h5>Validation Error</h5>
        <p>${err.message}</p>
      </div>
    `;
    evalResultBox.className = 'evaluation-result-box';
    evalResultBox.innerHTML = `
      <div class="eval-status-placeholder">
        <i class="fa-solid fa-bug" style="color:var(--danger); opacity:0.6;"></i> Parse failed, evaluation blocked
      </div>
    `;
  }
}

// -----------------------------------------------------------------------------
// SANDBOX VALUE MOUNTING
// -----------------------------------------------------------------------------

function renderSandboxInputs() {
  const container = document.getElementById('sandbox-fields-container');
  container.innerHTML = '';

  SYSTEM_FIELDS.forEach(field => {
    const row = document.createElement('div');
    row.className = 'sandbox-field-row';

    const labelMeta = document.createElement('div');
    labelMeta.className = 'sandbox-field-meta';
    labelMeta.innerHTML = `
      <span class="sandbox-field-label">${field.name}</span>
      <span class="field-type ${field.type}" style="font-size:0.6rem; padding:0 0.25rem;">${field.type}</span>
    `;
    row.appendChild(labelMeta);

    const inputVal = state.sandboxValues[field.name];

    if (field.type === 'boolean') {
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'sandbox-field-checkbox-container';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'sandbox-field-checkbox';
      checkbox.id = `sandbox-chk-${field.name}`;
      checkbox.checked = inputVal;

      const checkboxLabel = document.createElement('label');
      checkboxLabel.htmlFor = checkbox.id;
      checkboxLabel.className = 'sandbox-field-checkbox-label';
      checkboxLabel.textContent = inputVal ? 'TRUE' : 'FALSE';

      checkbox.addEventListener('change', (e) => {
        state.sandboxValues[field.name] = e.target.checked;
        checkboxLabel.textContent = e.target.checked ? 'TRUE' : 'FALSE';
        validateAndEvaluate();
      });

      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(checkboxLabel);
      row.appendChild(checkboxContainer);
    } else {
      const input = document.createElement('input');
      input.type = field.type === 'number' ? 'number' : 'text';
      input.className = 'sandbox-field-input';
      input.value = inputVal;

      input.addEventListener('input', (e) => {
        let val = e.target.value;
        if (field.type === 'number') {
          val = val === '' ? 0 : parseFloat(val);
        }
        state.sandboxValues[field.name] = val;
        validateAndEvaluate();
      });

      row.appendChild(input);
    }

    container.appendChild(row);
  });
}
