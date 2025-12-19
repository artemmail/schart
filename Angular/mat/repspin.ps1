ng build

$indexFilePath = "C:\Stock\8.0\Angular\mat\dist\angular-material-login-template\index.html"

# Путь к файлу, содержащему новую строку
$newContentFilePath = "spinner.html"

# Строка для замены
$oldString = "<angular-material-drawer></angular-material-drawer>"

# Чтение содержимого исходного файла index.html
$indexContent = Get-Content -Path $indexFilePath -Raw

# Чтение новой строки из файла
$newString = Get-Content -Path $newContentFilePath -Raw

# Замена старой строки на новую
$updatedContent = $indexContent -replace [regex]::Escape($oldString), $newString
# Сохранение обновленного содержимого обратно в файл index.html
Set-Content -Path $indexFilePath -Value $updatedContent

Write-Host "Замена строки выполнена успешно."
