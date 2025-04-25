import React from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
  children: string;
}

// Using a completely different approach - rendering raw HTML instead of using ReactMarkdown components
const MarkdownRenderer = ({ children }: MarkdownRendererProps) => {
  // Create a div to hold the content
  return (
    <div className="markdown-content">
      {/* Use dangerouslySetInnerHTML as a workaround to avoid ReactMarkdown className issues */}
      <div
        dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(children) }}
      />
    </div>
  );
};

// Simple function to convert basic markdown to HTML
function convertMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  let html = markdown;

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Lists
  html = html.replace(/^\* (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Wrap lists in ul/ol tags
  html = html.replace(/(<li>.+<\/li>\n)+/g, (match) => {
    return `<ul>${match}</ul>`;
  });

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Paragraphs - replace double newlines with paragraph breaks
  html = html.replace(/\n\n/g, "</p><p>");

  // Wrap in paragraph tags if not already wrapped
  if (
    !html.startsWith("<h1>") &&
    !html.startsWith("<h2>") &&
    !html.startsWith("<h3>") &&
    !html.startsWith("<ul>") &&
    !html.startsWith("<p>")
  ) {
    html = `<p>${html}</p>`;
  }

  return html;
}

export default MarkdownRenderer;
