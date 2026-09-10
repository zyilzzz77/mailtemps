package smtpserver

import (
	"html"
	"regexp"
	"strings"
)

var (
	htmlCommentPattern    = regexp.MustCompile(`(?is)<!--.*?-->`)
	htmlHiddenPattern     = regexp.MustCompile(`(?is)<(head|script|style|noscript)\b[^>]*>.*?</(head|script|style|noscript)\s*>`)
	htmlBlockBreakPattern = regexp.MustCompile(`(?i)</?(p|div|br|tr|li|h[1-6]|table|thead|tbody|tfoot|ul|ol|dl|dt|dd|blockquote|hr|pre|address|section|article|header|footer|form|figure)[^>]*>`)
	htmlAnyTagPattern     = regexp.MustCompile(`(?is)<[^>]*>`)
	htmlSignalPattern     = regexp.MustCompile(`(?i)<\s*(!doctype|html|head|body|div|p|table|span|a|b|strong|i|em|u|font|br|img|ul|ol|li|h[1-6]|style|script|meta|center|form|input|button|td|th|tr|section|article|header|footer|blockquote)\b`)
	htmlSpaceRunPattern   = regexp.MustCompile(`[ \t]+`)
	htmlNewlineRunPattern = regexp.MustCompile(`\n{2,}`)
)

func looksLikeHTML(body string) bool {
	return htmlSignalPattern.MatchString(body)
}

func htmlToText(body string) string {
	body = htmlCommentPattern.ReplaceAllString(body, "")
	body = htmlHiddenPattern.ReplaceAllString(body, "")
	body = htmlBlockBreakPattern.ReplaceAllString(body, "\n")
	body = htmlAnyTagPattern.ReplaceAllString(body, "")
	body = html.UnescapeString(body)
	body = strings.ReplaceAll(body, "\u00a0", " ")
	body = strings.ReplaceAll(body, "\r\n", "\n")
	body = strings.ReplaceAll(body, "\r", "\n")
	body = strings.ReplaceAll(body, "\t", " ")

	lines := strings.Split(body, "\n")
	cleaned := make([]string, 0, len(lines))
	for _, line := range lines {
		cleaned = append(cleaned, strings.TrimSpace(htmlSpaceRunPattern.ReplaceAllString(line, " ")))
	}
	body = strings.TrimSpace(strings.Join(cleaned, "\n"))
	return htmlNewlineRunPattern.ReplaceAllString(body, "\n")
}
