!include "LogicLib.nsh"
!include "nsDialogs.nsh"

!ifndef BUILD_UNINSTALLER
Var AutoStartCheckbox
Var AutoStartChoice
!endif

!macro customInit
!ifndef BUILD_UNINSTALLER
  StrCpy $AutoStartChoice "unchanged"
!endif
!macroend

!ifndef BUILD_UNINSTALLER
!macro customPageAfterChangeDir
  Page custom AutoStartPageCreate AutoStartPageLeave
!macroend

Function AutoStartPageCreate
  nsDialogs::Create 1018
  Pop $0

  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "추가 옵션"
  Pop $1
  SetCtlColors $1 "" "transparent"

  ${NSD_CreateLabel} 0 18u 100% 28u "원하는 설치 옵션을 선택해 주세요."
  Pop $2
  SetCtlColors $2 "" "transparent"

  ${NSD_CreateCheckbox} 0 56u 100% 12u "컴퓨터 시작 시 자동 실행"
  Pop $AutoStartCheckbox

  ReadRegStr $3 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${PRODUCT_NAME}"
  ${If} $3 != ""
    ${NSD_Check} $AutoStartCheckbox
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function AutoStartPageLeave
  ${NSD_GetState} $AutoStartCheckbox $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $AutoStartChoice "1"
  ${Else}
    StrCpy $AutoStartChoice "0"
  ${EndIf}
FunctionEnd
!endif

!macro customInstall
  ${If} $AutoStartChoice == "1"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${PRODUCT_NAME}" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
  ${ElseIf} $AutoStartChoice == "0"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${PRODUCT_NAME}"
  ${EndIf}
!macroend

!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${PRODUCT_NAME}"
!macroend
