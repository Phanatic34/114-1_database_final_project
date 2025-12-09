@echo off
chcp 65001 >nul
echo ============================================================
echo 資料庫備份工具
echo ============================================================
echo.

cd /d "%~dp0"

echo 正在備份資料庫...
python backup_databases.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo 備份完成！
    pause
) else (
    echo.
    echo 備份過程中發生錯誤！
    pause
)



