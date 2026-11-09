Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice('Microsoft David Desktop')
$s.Rate = 0
$s.Volume = 100

$lines = [ordered]@{
  'n2' = 'Everything keeps moving. The equator itself turns at sixteen hundred kilometers an hour!'
  'n3' = 'The oceans would not stop. Their motion could raise devastating tsunamis.'
  'n5' = 'Earth''s rotation gives us day and night. Without it... could you survive?'
}

foreach ($k in $lines.Keys) {
  $path = "public\films\earth-stopped\tts\$k-raw.wav"
  $s.SetOutputToWaveFile($path)
  $s.Speak($lines[$k])
  $s.SetOutputToNull()
  Write-Output "made $k"
}
$s.Dispose()
