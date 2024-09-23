{ pkgs }: {
  deps = [
    pkgs.libGLU
    pkgs.libGL
    pkgs.glibcLocales
    pkgs.python310Full   # or python38Full if you're using Python 3.8
    pkgs.python310Packages.pip
    pkgs.tesseract       # This line installs Tesseract OCR
    pkgs.imagemagick     # Optional: Installs ImageMagick for image processing
  ];
}
