-- Pandoc Lua filter for course exports.
--
-- Maps the fenced Divs the exporter emits (alert / link-card / attachment /
-- page-break) onto format-specific output: Typst calls the helpers defined in
-- template.typ; DOCX uses custom paragraph styles from reference.docx.
--
-- Alert kinds and Dutch titles mirror ALERT_CONFIG in
-- lib/convert/markdown-to-html.js. Keep both in sync.

local ALERT_TITLES = {
  note = "Info",
  tip = "Tip",
  important = "Belangrijk",
  warning = "Waarschuwing",
  caution = "Opgelet",
  check = "Check",
}

local ALERT_KINDS = {
  note = true, tip = true, important = true,
  warning = true, caution = true, check = true,
}

-- Escape a Lua string for inclusion inside a Typst string literal.
local function typst_str(s)
  return s:gsub("\\", "\\\\"):gsub('"', '\\"')
end

local function has_class(el, name)
  for _, c in ipairs(el.classes) do
    if c == name then return true end
  end
  return false
end

local function alert_kind(el)
  for _, c in ipairs(el.classes) do
    if ALERT_KINDS[c] then return c end
  end
  return "note"
end

-- Typst raw blocks that open/close a call around the div's content.
local function typst_open(code)
  return pandoc.RawBlock("typst", code)
end

local function render_typst_alert(el)
  local kind = alert_kind(el)
  local title = ALERT_TITLES[kind] or "Info"
  local blocks = pandoc.List()
  blocks:insert(typst_open('#alert("' .. kind .. '", "' .. typst_str(title) .. '")['))
  blocks:extend(el.content)
  blocks:insert(typst_open("]"))
  return blocks
end

local function render_typst_linkcard(el)
  -- Expect the div to carry data-title / data-url attributes.
  local title = el.attributes["title"] or ""
  local url = el.attributes["url"] or ""
  return typst_open('#linkcard("' .. typst_str(title) .. '", "' .. typst_str(url) .. '")')
end

local function render_typst_attachment(el)
  local name = el.attributes["name"] or ""
  return typst_open('#attachment("' .. typst_str(name) .. '")')
end

-- DOCX: wrap content paragraphs in a custom style by stashing the style name.
local function styled(blocks, style)
  local out = pandoc.List()
  for _, b in ipairs(blocks) do
    if b.t == "Para" or b.t == "Plain" then
      out:insert(pandoc.Div({ b }, pandoc.Attr("", {}, { ["custom-style"] = style })))
    else
      out:insert(b)
    end
  end
  return out
end

local function render_docx_alert(el)
  local kind = alert_kind(el)
  local title = ALERT_TITLES[kind] or "Info"
  local blocks = pandoc.List()
  blocks:insert(pandoc.Div(
    { pandoc.Para({ pandoc.Str(title) }) },
    pandoc.Attr("", {}, { ["custom-style"] = "Alert Title" })
  ))
  blocks:extend(styled(el.content, "Alert Body"))
  return blocks
end

local function render_docx_linkcard(el)
  local title = el.attributes["title"] or ""
  local url = el.attributes["url"] or ""
  return {
    pandoc.Div({ pandoc.Para({ pandoc.Str(title) }) },
      pandoc.Attr("", {}, { ["custom-style"] = "Link Card Title" })),
    pandoc.Div({ pandoc.Para({ pandoc.Link({ pandoc.Str(url) }, url) }) },
      pandoc.Attr("", {}, { ["custom-style"] = "Link Card" })),
  }
end

local function render_docx_attachment(el)
  local name = el.attributes["name"] or ""
  return pandoc.Div(
    { pandoc.Para({ pandoc.Strong({ pandoc.Str("Bijlage:") }), pandoc.Space(), pandoc.Str(name) }) },
    pandoc.Attr("", {}, { ["custom-style"] = "Attachment" })
  )
end

function Div(el)
  local is_typst = FORMAT:match("typst")
  local is_docx = FORMAT:match("docx")

  if has_class(el, "alert") then
    if is_typst then return render_typst_alert(el) end
    if is_docx then return render_docx_alert(el) end
  elseif has_class(el, "link-card") then
    if is_typst then return render_typst_linkcard(el) end
    if is_docx then return render_docx_linkcard(el) end
  elseif has_class(el, "attachment") then
    if is_typst then return render_typst_attachment(el) end
    if is_docx then return render_docx_attachment(el) end
  elseif has_class(el, "page-break") then
    if is_typst then return typst_open("#pagebreak(weak: true)") end
    if is_docx then
      return pandoc.RawBlock("openxml", '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    end
  end

  return nil
end
