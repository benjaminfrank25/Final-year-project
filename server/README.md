# Server

## Office document previews

DOCX and PPTX materials are converted to PDF by LibreOffice when first previewed.
The converted PDF is cached on the server and served through the authenticated,
level-checked `/api/materials/:id/preview` endpoint. Downloads continue to
return the original Office file.

Install LibreOffice on the server host and make `soffice` available on `PATH`.
If the executable is elsewhere, set `SOFFICE_PATH` in the server environment:

On Debian or Ubuntu:

```sh
sudo apt-get update
sudo apt-get install -y libreoffice
```

```env
SOFFICE_PATH=soffice
```

For Windows, use the full path to `soffice.exe`, for example:

```env
SOFFICE_PATH=C:\Program Files\LibreOffice\program\soffice.exe
```

Restart the server after changing the environment. Previews require enough
temporary disk space for conversion and use a two-minute conversion timeout.

## Material file storage

PDF, DOCX, and PPTX material uploads are stored in Cloudinary and retrieved
through the authenticated material file endpoint. Configure these server
environment variables:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Older materials uploaded before Cloudinary was configured continue to use their
existing local files.

## Keep-alive ping

The `Stay alive` GitHub Actions workflow pings the server health endpoint every
10 minutes. Set the repository Actions variable `HEALTHCHECK_URL` to the full
URL, including `/api/health` (for example, `https://your-server.example.com/api/health`).
