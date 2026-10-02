@echo off
cd /d "%~dp0"
echo Dang dua toan bo du an len nhanh master tren GitHub...
git push origin HEAD:master
if errorlevel 1 (
  echo.
  echo Chua tai len duoc. Kiem tra ket noi Internet, dang nhap GitHub, hoac thay doi moi tren master.
  pause
  exit /b 1
)
echo.
echo Da tai len. Mo https://github.com/Harry-Sun-Winny/iinvement-2- de kiem tra.
pause
