$ErrorActionPreference = 'Stop'

if (-not (Get-Command java -ErrorAction SilentlyContinue) -and -not $env:JAVA_HOME) {
    throw 'JDK 17 이상을 설치하고 JAVA_HOME 또는 PATH를 설정해 주세요.'
}

& "$PSScriptRoot\gradlew.bat" bootRun @args
exit $LASTEXITCODE
