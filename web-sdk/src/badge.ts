/**
 * Zero-dependency embeddable `<wroughtmark-badge>` Web Component.
 * Usage:
 *   <script type="module" src="https://wroughtmark.com/sdk/wroughtmark-badge.js"></script>
 *   <wroughtmark-badge seal-id="wm_seal_..." discipline="music" sessions="4" active-seconds="3600"></wroughtmark-badge>
 */
export const BADGE_SCRIPT = `
class WroughtmarkBadge extends HTMLElement {
  connectedCallback() {
    const sealId = this.getAttribute('seal-id') || 'unsealed';
    const discipline = this.getAttribute('discipline') || 'work';
    const sessions = this.getAttribute('sessions') || '0';
    const secs = Number(this.getAttribute('active-seconds') || '0');
    const mins = Math.max(1, Math.round(secs / 60));
    const verifyUrl = this.getAttribute('verify-url') || 'https://wroughtmark.com';
    const theme = this.getAttribute('theme') === 'light' ? 'light' : 'dark';
    const bg = theme === 'light' ? '#ffffff' : '#171a21';
    const fg = theme === 'light' ? '#0f1218' : '#f2f4f8';
    const border = theme === 'light' ? '#d7dbe3' : '#2d3340';
    const dot = theme === 'light' ? '#9d6616' : '#e2ac55';
    const meta = theme === 'light' ? '#596170' : '#9aa0aa';

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = \`
      <style>
        :host { display: inline-block; font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, sans-serif; }
        a {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 8px 14px; border-radius: 999px;
          background: \${bg}; color: \${fg}; border: 1px solid \${border};
          text-decoration: none; font-size: 13px; line-height: 1.2;
          transition: border-color .15s ease;
        }
        a:hover { border-color: \${dot}; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: \${dot}; flex-shrink: 0; }
        .meta { color: \${meta}; font-size: 12px; }
      </style>
      <a href="\${verifyUrl}" target="_blank" rel="noopener noreferrer" title="Verified by Wroughtmark (\${sealId})">
        <span class="dot"></span>
        <span><strong>Wroughtmark</strong> Verified</span>
        <span class="meta">\${discipline} · \${sessions} sessions · \${mins}m</span>
      </a>
    \`;
  }
}
if (!customElements.get('wroughtmark-badge')) {
  customElements.define('wroughtmark-badge', WroughtmarkBadge);
}
`.trim();
