# LLR: Premium Formula Builder 

> [!NOTE]
> **Document Purpose**: This Low-Level Requirements (LLR) document translates business needs into actionable development tasks. It defines the structure, behavior, and constraints of the Premium Formula Builder tool for the engineering team.

---

## 🎯 EPIC: Visual & Secure Formula Builder for Business Rule Engine
**Epic ID**: EPIC-FB-001
**Description**: 
As a business analyst/decision rule author, I need a visual, token-based formula builder that provides real-time syntax checking and context-aware guidance, so that I can confidently configure complex validation rules and decision logic without writing raw code or risking SQL/Regex injections.

**Business Value**:
- **Security**: Eliminates arbitrary script/SQL injection by confining inputs to structured tokens and strict AST (Abstract Syntax Tree) parsing.
- **Efficiency**: Reduces formula configuration errors by 90% through real-time feedback and intelligent UI disablement.
- **Empowerment**: Lowers the technical barrier, allowing non-technical business users to write complex logical expressions.

---

## 📖 User Stories & Acceptance Criteria

### US-01: Token-based Interactive Editor (Core UI)
**As a** business user, **I want to** build formulas by clicking elements to generate visual "tokens" rather than typing raw text, **so that** I don't have to worry about spacing, quoting, or injection vulnerabilities.

**Acceptance Criteria (AC):**
- **AC 1.1 (Token Insertion)**: Clicking any Field, Function, or Operator from the left toolbox must insert a discrete, colored token pill at the current cursor position.
- **AC 1.2 (Function Placeholders)**: When a function is inserted, it must automatically generate nested placeholder tokens for its required parameters (e.g., inserting `length()` creates `length([text])`).
- **AC 1.3 (Inline Editing)**: Placeholders and literal tokens must contain inline text inputs. When typing, the width of the input must dynamically adjust to fit the text.
- **AC 1.4 (Keyboard Navigation)**: Users must be able to navigate between gaps and tokens using `Left/Right Arrow` keys, and jump to the next placeholder using the `Tab` key.
- **AC 1.5 (Deletion)**: Tokens can be removed via an 'X' icon on the token or by pressing `Backspace` when the cursor is directly after them. Bracket tokens `()` associated with functions cannot be deleted individually.

---

### US-02: Real-time AST Parsing & Type Validation
**As a** business user, **I want** the system to instantly validate the formula as I build it, **so that** I am alerted to logic or type mismatch errors before I deploy the rule.

**Acceptance Criteria (AC):**
- **AC 2.1 (Syntax Completeness)**: The system must continuously attempt to parse the tokens. If there are trailing operators or unclosed brackets, a red syntax error must be displayed in the status console.
- **AC 2.2 (Type Mismatch Prevention)**: The parser must strictly enforce data type compatibility. If a `Boolean` is compared to a `String`, or an arithmetic operator is applied to a `String`, an error must instantly appear.
- **AC 2.3 (Root Evaluation)**: The final evaluated return type of the entire formula tree must be a `Boolean` (since these are validation rules). If the final type is not Boolean, a warning must be displayed.

---

### US-03: Context-Aware Smart Toolbox (Preventative UX)
**As a** business user, **I want** the toolbox to intelligently disable options that are not applicable to my current cursor position, **so that** I am prevented from making syntax and typing mistakes.

**Acceptance Criteria (AC):**
- **AC 3.1 (Expected Mode Check)**: If the active cursor is inside a function parameter placeholder (e.g., expecting a `String`), all Operators must be disabled. Any functions that do not return a `String` (e.g., `isnumeric()`, which returns Boolean) must also be disabled.
- **AC 3.2 (Supplied Mode Check)**: If the cursor is immediately after a completed token (e.g., a field `is_active` [Boolean]), mathematical and size-comparison operators (`>`, `<`, `>=`, `<=`) must be disabled. 
- **AC 3.3 (Operator Sequence)**: Functions and Fields must be disabled immediately after another value (preventing `phone_number length()`). A logical/comparison operator must be selected first.
- **AC 3.4 (Tooltips)**: Hovering over a disabled button must show a native tooltip explaining the specific reason (e.g., *"Placeholder expects string, but length() returns number"*).

---

### US-04: Live Sandbox Execution Tester
**As a** rule author, **I want** to test my formula with mock data on the same screen, **so that** I can verify its logical behavior without deploying to a testing environment.

**Acceptance Criteria (AC):**
- **AC 4.1 (Dynamic Form Generation)**: The system must scan the formula for any `Field` tokens used. For each unique field, a corresponding input field must be rendered in the right-hand Sandbox panel.
- **AC 4.2 (Real-time Evaluation)**: As the user types mock values into the sandbox, the AST must execute the formula instantly against the mock data payload.
- **AC 4.3 (Result Visualization)**: A prominent success/failure block must display `PASSED (TRUE)` in green or `FAILED (FALSE)` in red based on the execution result.
- **AC 4.4 (Debug Output)**: If the result is FAILED, the system must expand to show a trace of the arguments passed to the topmost failing function (e.g., `Function Args: ["13812345678", "1,3,8"]`) for easy debugging.
