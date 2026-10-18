param([int]$BrowserProcessId)
$ErrorActionPreference='Stop'
while(Get-Process -Id $BrowserProcessId -ErrorAction SilentlyContinue){
 $tree=Get-CimInstance Win32_Process -Filter "Name='chrome.exe'"
 $owned=[System.Collections.Generic.HashSet[int]]::new()
 [void]$owned.Add($BrowserProcessId)
 do{$added=$false;foreach($proc in $tree){if($owned.Contains([int]$proc.ParentProcessId)-and $owned.Add([int]$proc.ProcessId)){$added=$true}}}while($added)
 $workingSet=0L;$privateBytes=0L;$count=0
 foreach($processId in $owned){$proc=Get-Process -Id $processId -ErrorAction SilentlyContinue;if($proc){$workingSet+=$proc.WorkingSet64;$privateBytes+=$proc.PrivateMemorySize64;$count++}}
 @{workingSetBytes=$workingSet;privateBytes=$privateBytes;processes=$count;at=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()}|ConvertTo-Json -Compress
 Start-Sleep -Milliseconds 500
}
