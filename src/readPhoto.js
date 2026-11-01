export const readPhoto = (file) =>
  new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => {
      const img = new Image()
      img.onload = () => {
        const W = 240, H = 320
        let sw = img.width, sh = (sw * H) / W
        if (sh > img.height) { sh = img.height; sw = (sh * W) / H }
        const c = document.createElement('canvas')
        c.width = W; c.height = H
        c.getContext('2d').drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H)
        resolve(c.toDataURL('image/jpeg', 0.8))
      }
      img.src = r.result
    }
    r.readAsDataURL(file)
  })
