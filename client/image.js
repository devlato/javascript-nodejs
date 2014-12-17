
export function thumb(url, width, height) {
  var pixelRatio = parseFloat(document.cookie.slice(document.cookie.indexOf('pixelRatio=') + 11)) || 1;

  // return pixelRatio times larger image for retina
  width *= pixelRatio;
  height *= pixelRatio;

  var modifier = (width < 320 && height < 320) ? 't' :
    (width < 640 && height < 640) ? 'm' :
      (width < 1280 && height < 1280) ? 'l' : '';

  return url.slice(0, url.lastIndexOf('.')) + modifier + url.slice(url.lastIndexOf('.'));
}
