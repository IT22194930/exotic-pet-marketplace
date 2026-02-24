@echo off
echo Starting All Exotic Pet Marketplace Services...
echo.

echo Stopping existing Node processes...
taskkill /f /im node.exe > nul 2>&1

echo.

echo Starting Identity Service on port 8001...
cd "%~dp0services\identity-service"
echo Installing dependencies...
call npm install > nul 2>&1
start "Identity Service" cmd /k npm run dev
cd "%~dp0"
timeout /t 3 /nobreak > nul

echo Starting Listing Service on port 8002...
cd "%~dp0services\listing-service"
echo Installing dependencies...
call npm install > nul 2>&1
start "Listing Service" cmd /k npm run dev
cd "%~dp0"
timeout /t 2 /nobreak > nul

echo Starting Order Service on port 8003...
cd "%~dp0services\order-service"
echo Installing dependencies...
call npm install > nul 2>&1
start "Order Service" cmd /k npm run dev
cd "%~dp0"
timeout /t 2 /nobreak > nul

echo Starting Compliance Service on port 8004...
cd "%~dp0services\compliance-service"
echo Installing dependencies...
call npm install > nul 2>&1
start "Compliance Service" cmd /k npm run dev
cd "%~dp0"
timeout /t 2 /nobreak > nul

echo.
echo All services started successfully!
echo.
echo Services running on:
echo   - Identity Service:   http://localhost:8001
echo   - Listing Service:    http://localhost:8002
echo   - Order Service:      http://localhost:8003
echo   - Compliance Service: http://localhost:8004
echo.
pause
