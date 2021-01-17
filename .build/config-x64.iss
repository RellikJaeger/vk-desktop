[Setup]
AppId=VKDesktop
AppName=VK Desktop
AppVersion=0.3.0-alpha.4
AppPublisher=danyadev
AppPublisherURL=https://vk.com/danyadev
AppSupportURL=https://vk.com/vk_desktop_app
AppUpdatesURL=https://github.com/danyadev/vk-desktop/releases
DefaultDirName={localappdata}\VK Desktop
DisableDirPage=yes
DisableProgramGroupPage=yes
OutputDir=..\build
OutputBaseFilename=VK-Desktop-Setup-x64
SetupIconFile=.\icon.ico
UninstallDisplayIcon={app}\VK Desktop.exe
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=none

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\build\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs allowunsafefiles

[Icons]
Name: "{commonprograms}\VK Desktop"; Filename: "{app}\VK Desktop.exe"
Name: "{commondesktop}\VK Desktop"; Filename: "{app}\VK Desktop.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\VK Desktop.exe"; Description: "{cm:LaunchProgram,VK Desktop}"; Flags: nowait postinstall skipifsilent
