$ErrorActionPreference = "Stop"

$vmName = "Home Assistant"
$baseFolder = "C:\home-assistant"
$downloadUrl = "https://github.com/home-assistant/operating-system/releases/download/17.2/haos_ova-17.2.vdi.zip"
$zipPath = Join-Path $baseFolder "haos_ova-17.2.vdi.zip"
$vdiPath = Join-Path $baseFolder "haos_ova-17.2.vdi"
$vboxManage = "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"

if (!(Test-Path $vboxManage)) {
  throw "VBoxManage niet gevonden op $vboxManage"
}

New-Item -ItemType Directory -Force -Path $baseFolder | Out-Null

if (!(Test-Path $zipPath)) {
  Write-Host "Download Home Assistant OS image..."
  curl.exe -L --fail --ssl-no-revoke -o $zipPath $downloadUrl
}

if (!(Test-Path $vdiPath)) {
  Write-Host "Pak VDI uit..."
  Expand-Archive -Path $zipPath -DestinationPath $baseFolder -Force
}

if (!(Test-Path $vdiPath)) {
  throw "VDI niet gevonden na uitpakken: $vdiPath"
}

Write-Host "Registreer VirtualBox VM..."
& $vboxManage createvm --name $vmName --basefolder $baseFolder --register
& $vboxManage modifyvm $vmName --ostype "Oracle_64" --memory 4096 --cpus 2 --firmware efi --graphicscontroller vmsvga --vram 64
& $vboxManage storagectl $vmName --name "SATA" --add sata --controller IntelAhci
& $vboxManage storageattach $vmName --storagectl "SATA" --port 0 --device 0 --type hdd --medium $vdiPath --nonrotational on --discard on

Write-Host "Netwerk instellen op NAT met port-forward 8124 -> 8123."
& $vboxManage modifyvm $vmName --nic1 nat
& $vboxManage modifyvm $vmName --natpf1 "ha-web,tcp,,8124,,8123"

Write-Host "Start Home Assistant..."
& $vboxManage startvm $vmName --type gui

Write-Host ""
Write-Host "Klaar. Wacht 5-20 minuten en open daarna:"
Write-Host "http://127.0.0.1:8124"
Write-Host ""
Write-Host "Let op: NAT is gestart met port-forward. Bridged netwerk kunnen we daarna instellen als VirtualBox na herstart correct reageert."
