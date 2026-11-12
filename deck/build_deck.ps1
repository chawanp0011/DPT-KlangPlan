# Build Fisko_Conceptual_Architecture_v0.2.pptx and .pdf from the v0.1 deck with PowerPoint (COM).
# Usage: node deck/gen_slides.js deck/slides.json ; powershell -File deck/build_deck.ps1
# The file is ASCII only; Thai text comes from deck/slides.json and deck/cover.json (UTF-8).
param([string]$Src = "D:\Avalant\AI_Product\Fisko-main\Fisko_Conceptual_Architecture.pptx", [string]$OutDir = "D:\Avalant\AI_Product\Fisko-ERP-Gov", [string]$Png = "")
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$slides = Get-Content -Raw -Encoding UTF8 (Join-Path $here "slides.json") | ConvertFrom-Json
$cover = Get-Content -Raw -Encoding UTF8 (Join-Path $here "cover.json") | ConvertFrom-Json
function C($hex) { [int]([Convert]::ToInt32($hex.Substring(0,2),16) + 256 * [Convert]::ToInt32($hex.Substring(2,2),16) + 65536 * [Convert]::ToInt32($hex.Substring(4,2),16)) }
$work = Join-Path $env:TEMP "fisko_v02_work.pptx"
Copy-Item $Src $work -Force
$app = New-Object -ComObject PowerPoint.Application
$d = $app.Presentations.Open($work, $false, $false, $false)
try {
  # cover
  foreach ($sh in $d.Slides.Item(7).Shapes) { if ($sh.HasTextFrame -and $sh.TextFrame.HasText) { foreach ($e in $cover) { [void]$sh.TextFrame.TextRange.Replace($e.find, $e.repl) } } }
  # five copies of the functional-architecture slide (title, logo, footer), placed after it
  for ($i = 0; $i -lt $slides.Count; $i++) { [void]$d.Slides.Item(13).Duplicate() }
  for ($i = 0; $i -lt $slides.Count; $i++) {
    $s = $d.Slides.Item(14 + $i); $spec = $slides[$i]
    for ($k = $s.Shapes.Count; $k -ge 5; $k--) { $s.Shapes.Item($k).Delete() }
    $s.Shapes.Item(3).TextFrame.TextRange.Text = $spec.eyebrow
    $s.Shapes.Item(4).TextFrame.TextRange.Text = $spec.title
    foreach ($p in $spec.p) {
      switch ($p.k) {
        "rr" { $sh = $s.Shapes.AddShape(5, $p.l, $p.t, $p.w, $p.h); $sh.Adjustments.Item(1) = 0.07; $sh.Fill.ForeColor.RGB = (C $p.fill); $sh.Shadow.Visible = 0
               if ($p.line) { $sh.Line.Visible = -1; $sh.Line.ForeColor.RGB = (C $p.line); $sh.Line.Weight = 0.75 } else { $sh.Line.Visible = 0 } }
        "ov" { $sh = $s.Shapes.AddShape(9, $p.l, $p.t, $p.w, $p.h); $sh.Fill.ForeColor.RGB = (C $p.fill); $sh.Line.Visible = 0; $sh.Shadow.Visible = 0 }
        "ln" { $sh = $s.Shapes.AddLine($p.x1, $p.y1, $p.x2, $p.y2); $sh.Line.ForeColor.RGB = (C $p.color); $sh.Line.Weight = [single]$p.w; if ($p.arrow) { $sh.Line.EndArrowheadStyle = 2 }; if ($p.dash) { $sh.Line.DashStyle = 4 } }
        "tx" { $sh = $s.Shapes.AddTextbox(1, $p.l, $p.t, $p.w, $p.h); $tf = $sh.TextFrame; $tf.WordWrap = -1; $tf.AutoSize = 0; $tf.MarginLeft = 0; $tf.MarginRight = 0; $tf.MarginTop = 0; $tf.MarginBottom = 0
               $sh.Height = $p.h; $sh.Width = $p.w; $tf.VerticalAnchor = $(if ($p.anchor -eq "middle") { 3 } else { 1 })
               $tr = $tf.TextRange; $tr.Text = ($p.text -replace "`n", "`r"); $tr.Font.Name = $p.font; $tr.Font.NameComplexScript = "Tahoma"; $tr.Font.Size = [single]$p.size; $tr.Font.Color.RGB = (C $p.color); $tr.Font.Bold = $(if ($p.bold) { -1 } else { 0 })
               $tr.ParagraphFormat.Alignment = $(switch ($p.align) { "center" { 2 } "right" { 3 } default { 1 } }) }
      }
    }
  }
  $pptx = Join-Path $OutDir "Fisko_Conceptual_Architecture_v0.2.pptx"; $pdf = Join-Path $OutDir "Fisko_Conceptual_Architecture_v0.2.pdf"
  $d.SaveCopyAs($pptx)
  $d.SaveAs($pdf, 32)
  if ($Png) { New-Item -ItemType Directory -Force $Png | Out-Null; for ($i = 1; $i -le $d.Slides.Count; $i++) { $d.Slides.Item($i).Export((Join-Path $Png ("s{0:00}.png" -f $i)), "PNG", 1280, 720) } }
  "slides: " + $d.Slides.Count
} finally { $d.Close(); $app.Quit() }


