Set WshShell = CreateObject("WScript.Shell")
' Run the batch file hidden
WshShell.Run chr(34) & "C:\Users\keert\OneDrive\Desktop\chat projects\start_chatbot.bat" & chr(34), 0
Set WshShell = Nothing
