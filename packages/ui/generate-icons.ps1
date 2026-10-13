Add-Type -AssemblyName System.Drawing

$srcFile = 'C:\Users\Emerm\.gemini\antigravity\brain\8b604aa0-8c95-46ab-9119-d1f6d6ff5a5f\.user_uploaded\media_1791308334447.png'
$outDir = 'C:\Users\Emerm\Desktop\STOKROVA\packages\ui\assets'

if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcFile)

# 1. Full Logo (922x235)
$logoBmp = New-Object System.Drawing.Bitmap(922, 235)
$g = [System.Drawing.Graphics]::FromImage($logoBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($srcBmp, (New-Object System.Drawing.Rectangle(0, 0, 922, 235)), (New-Object System.Drawing.Rectangle(49, 216, 922, 235)), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$logoBmp.Save("$outDir\stokrova-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$logoBmp.Dispose()

# 2. Standalone Symbol (185x233)
$symBmp = New-Object System.Drawing.Bitmap(185, 233)
$g = [System.Drawing.Graphics]::FromImage($symBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($srcBmp, (New-Object System.Drawing.Rectangle(0, 0, 185, 233)), (New-Object System.Drawing.Rectangle(49, 217, 185, 233)), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$symBmp.Save("$outDir\stokrova-symbol.png", [System.Drawing.Imaging.ImageFormat]::Png)

# 3. Helper to render centered square icons
function Render-SquareIcon([int]$size, [double]$scale, $bgBrushColor, [string]$path) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    if ($bgBrushColor -ne $null) {
        $brush = New-Object System.Drawing.SolidBrush($bgBrushColor)
        $g.FillRectangle($brush, 0, 0, $size, $size)
        $brush.Dispose()
    }
    
    $maxDimension = [math]::Round($size * $scale)
    $ratio = [math]::Min($maxDimension / 185.0, $maxDimension / 233.0)
    $targetW = [math]::Round(185.0 * $ratio)
    $targetH = [math]::Round(233.0 * $ratio)
    $destX = [math]::Round(($size - $targetW) / 2.0)
    $destY = [math]::Round(($size - $targetH) / 2.0)
    
    $destRect = New-Object System.Drawing.Rectangle([int]$destX, [int]$destY, [int]$targetW, [int]$targetH)
    $srcRect = New-Object System.Drawing.Rectangle(0, 0, 185, 233)
    $g.DrawImage($symBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

$colorDark = [System.Drawing.Color]::FromArgb(255, 30, 36, 40)   # #1E2428 (Brand Charcoal Slate)
$colorLight = [System.Drawing.Color]::FromArgb(255, 255, 255, 255) # #FFFFFF

# Android Adaptive Icon Layers (432x432, safe zone scale 0.58)
Render-SquareIcon 432 0.58 $null "$outDir\android-adaptive-foreground.png"

$bgDark = New-Object System.Drawing.Bitmap(432, 432)
$g = [System.Drawing.Graphics]::FromImage($bgDark)
$b = New-Object System.Drawing.SolidBrush($colorDark)
$g.FillRectangle($b, 0, 0, 432, 432)
$b.Dispose(); $g.Dispose()
$bgDark.Save("$outDir\android-adaptive-background-dark.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bgDark.Dispose()

$bgLight = New-Object System.Drawing.Bitmap(432, 432)
$g = [System.Drawing.Graphics]::FromImage($bgLight)
$b = New-Object System.Drawing.SolidBrush($colorLight)
$g.FillRectangle($b, 0, 0, 432, 432)
$b.Dispose(); $g.Dispose()
$bgLight.Save("$outDir\android-adaptive-background-light.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bgLight.Dispose()

# Desktop App Icons (512x512)
Render-SquareIcon 512 0.65 $colorDark "$outDir\desktop-icon-dark.png"
Render-SquareIcon 512 0.65 $colorLight "$outDir\desktop-icon-light.png"
Render-SquareIcon 512 0.72 $null "$outDir\desktop-icon-transparent.png"

# Web, PWA, and Mobile Icons
Render-SquareIcon 512 0.65 $colorDark "$outDir\icon-512.png"
Render-SquareIcon 192 0.65 $colorDark "$outDir\icon-192.png"
Render-SquareIcon 180 0.65 $colorDark "$outDir\apple-touch-icon.png"
Render-SquareIcon 32 0.82 $null "$outDir\favicon-32x32.png"
Render-SquareIcon 16 0.82 $null "$outDir\favicon-16x16.png"

$symBmp.Dispose()
$srcBmp.Dispose()

Write-Output "GENERATED_ALL_ICONS_SUCCESS"
