@echo off
rem Run the Noor API on 32-bit Windows.
rem Requires a 32-bit Java 17 JDK on PATH or JAVA_HOME (Azul Zulu x86).
setlocal
cd /d "%~dp0"

if defined JAVA_HOME (
  "%JAVA_HOME%\bin\java.exe" -version >nul 2>&1
  if errorlevel 1 (
    echo JAVA_HOME is set but java.exe was not found. Install 32-bit Java 17.
    exit /b 1
  )
) else (
  java -version >nul 2>&1
  if errorlevel 1 (
    echo Java 17 is required. Install the 32-bit Azul Zulu JDK and add it to PATH.
    exit /b 1
  )
)

rem 32-bit processes have a ~2 GB user address space. Keep the heap small.
if not defined JAVA_TOOL_OPTIONS set "JAVA_TOOL_OPTIONS=-Xms128m -Xmx512m -XX:MaxMetaspaceSize=160m"
if not defined MAVEN_OPTS set "MAVEN_OPTS=-Xms64m -Xmx256m"

call "%~dp0mvnw.cmd" spring-boot:run
exit /b %ERRORLEVEL%
