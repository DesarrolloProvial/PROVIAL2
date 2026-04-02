$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open('c:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb\tesis\Capitulo1_Tesis_PROVIAL.docx')
    $text = $doc.Content.Text
    $doc.Close($false)
    $text | Out-File 'c:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb\tesis\Capitulo1.txt' -Encoding UTF8

    $doc2 = $word.Documents.Open('c:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb\tesis\Antecedentes_PROVIAL.docx')
    $text2 = $doc2.Content.Text
    $doc2.Close($false)
    $text2 | Out-File 'c:\Users\chris\OneDrive\Escritorio\proyectoProvialMovilWeb\tesis\Antecedentes.txt' -Encoding UTF8

    Write-Host 'OK'
} finally {
    $word.Quit()
}
