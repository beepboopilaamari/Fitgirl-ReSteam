# Copy latest cache to repo before building release
Copy-Item -Path "C:\Users\ilaf\AppData\Roaming\fitgirl-resteam\games.db" -Destination "D:\fitgirlresteam\resources\games.db" -Force
Write-Host "Updated resources/games.db with latest cache"
