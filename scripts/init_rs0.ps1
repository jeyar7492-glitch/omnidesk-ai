$mongosh = (Get-ChildItem -Path "$env:LOCALAPPDATA\Programs\mongosh" -Recurse -Filter "mongosh.exe" | Select-Object -ExpandProperty FullName -First 1)

Write-Host "mongosh: $mongosh"
Write-Host "Initiating replica set rs0..."
$initRes = & $mongosh --port 27017 --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] })" --quiet
Write-Host "rs.initiate output: $initRes"

Start-Sleep -Seconds 3

Write-Host "`nReplica set status:"
$statusRes = & $mongosh --port 27017 --eval "
  const s = rs.status();
  print('set: ' + s.set);
  print('ok: ' + s.ok);
  print('myState: ' + s.myState);
  print('members[0].name: ' + s.members[0].name);
  print('members[0].stateStr: ' + s.members[0].stateStr);
  print('members[0].health: ' + s.members[0].health);
" --quiet
Write-Host $statusRes
