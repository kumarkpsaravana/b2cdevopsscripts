[Cmdletbinding()]
Param(
    [Parameter(Mandatory = $true)][string]$ClientID,
    [Parameter(Mandatory = $true)][string]$ClientSecret,
    [Parameter(Mandatory = $true)][string]$Tenant,
    [Parameter(Mandatory = $true)][string]$PolicyId, 
    [Parameter(Mandatory = $true)][string]$PathToFile,    
    [Parameter(Mandatory = $true)][string]$IdentityExperienceFrameworkAppId,
    [Parameter(Mandatory = $true)][string]$ProxyIdentityExperienceFrameworkAppId,
    [Parameter(Mandatory = $true)][string]$HYPRClientId,
    [Parameter(Mandatory = $true)][string]$B2CExtensionAppId,
    [Parameter(Mandatory = $true)][string]$B2CExtensionAppObjectId,
    [Parameter(Mandatory = $true)][string]$TemplateBlobHostName,
    [Parameter(Mandatory = $true)][string]$GETCustomerNosAPI,
    [Parameter(Mandatory = $true)][string]$ValidateLoginAPI,
    [Parameter(Mandatory = $true)][string]$HYPRMetadata,
    [Parameter(Mandatory = $true)][string]$HYPRProviderName
)

try {
    $body = @{grant_type = "client_credentials"; scope = "https://graph.microsoft.com/.default"; client_id = $ClientID; client_secret = $ClientSecret }

    $response = Invoke-RestMethod -Uri https://login.microsoftonline.com/$Tenant/oauth2/v2.0/token -Method Post -Body $body
    $token = $response.access_token

    $headers = New-Object "System.Collections.Generic.Dictionary[[String],[String]]"
    $headers.Add("Content-Type", 'application/xml')
    $headers.Add("Authorization", 'Bearer ' + $token)

    $graphuri = 'https://graph.microsoft.com/beta/trustframework/policies/' + $PolicyId + '/$value'
    
    $policycontent = Get-Content $PathToFile

    #ReadApplicationSettings
    $Environment = $env:ENVIRONMENT

    $applicationSettings = Get-Content "appsettings.json" | ConvertFrom-Json
    $environmentSettings = $applicationSettings.Environments.where({$_.Name -eq "endgame"})

    $environmentSettings.PolicySettings.IdentityExperienceFrameworkAppId = $IdentityExperienceFrameworkAppId
    $environmentSettings.PolicySettings.ProxyIdentityExperienceFrameworkAppId = $ProxyIdentityExperienceFrameworkAppId
    $environmentSettings.PolicySettings.HYPRClientId = $HYPRClientId
    $environmentSettings.PolicySettings.B2CExtensionAppId = $B2CExtensionAppId
    $environmentSettings.PolicySettings.B2CExtensionAppObjectId = $B2CExtensionAppObjectId
    $environmentSettings.PolicySettings.TemplateBlobHostName = $TemplateBlobHostName
    $environmentSettings.PolicySettings.GETCustomerNosAPI = $GETCustomerNosAPI
    $environmentSettings.PolicySettings.ValidateLoginAPI = $ValidateLoginAPI
    $environmentSettings.PolicySettings.HYPRMetadata = $HYPRMetadata
    $environmentSettings.PolicySettings.HYPRProviderName = $HYPRProviderName

    #replace Settings:Tenant
    $policycontent = $policycontent -replace "{Settings:Tenant}", $Tenant

    foreach ($setting in $environmentSettings.PolicySettings.PsObject.Properties)
    {
        $policycontent = $policycontent -replace "{Settings:$($setting.Name)}", $setting.value
    }



    $response = Invoke-RestMethod -Uri $graphuri -Method Put -Body $policycontent -Headers $headers

    Write-Host "Policy" $PolicyId "uploaded successfully."
}
catch {
    Write-Host "StatusCode:" $_.Exception.Response.StatusCode.value__

    $_

    $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $streamReader.BaseStream.Position = 0
    $streamReader.DiscardBufferedData()
    $errResp = $streamReader.ReadToEnd()
    $streamReader.Close()

    $ErrResp

    exit 1
}

exit 0