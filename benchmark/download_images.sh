#!/usr/bin/env bash
# download_images.sh — Download 90 real Alibaba product images for benchmarking
# Run from the fix-pictures-app directory:
#   bash benchmark/download_images.sh
#
# Requires: curl (pre-installed on macOS)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGES_DIR="$SCRIPT_DIR/images"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
REF="https://www.alibaba.com/"

total=0
errors=0

download_image() {
  local category="$1"
  local filename="$2"
  local url="$3"
  local dest="$IMAGES_DIR/$category/$filename"

  if [ -f "$dest" ] && [ "$(wc -c < "$dest")" -gt 2000 ]; then
    echo "  ✓ skip (exists) $category/$filename"
    return 0
  fi

  mkdir -p "$IMAGES_DIR/$category"
  if curl -s -L --max-time 30 \
       -A "$UA" -H "Referer: $REF" \
       "$url" -o "$dest" 2>/dev/null; then
    local size
    size=$(wc -c < "$dest" 2>/dev/null || echo 0)
    if [ "$size" -gt 2000 ]; then
      total=$((total + 1))
      echo "  ✓ [$total] $category/$filename  ($(( size / 1024 ))KB)"
    else
      rm -f "$dest"
      errors=$((errors + 1))
      echo "  ✗ too small: $category/$filename"
    fi
  else
    errors=$((errors + 1))
    echo "  ✗ failed: $category/$filename"
  fi
}

echo ""
echo "📥 Downloading 90 real Alibaba product images..."
echo "   Saving to: $IMAGES_DIR"
echo ""

# ── electronics (earphones / bluetooth) ──────────────────────────────────────
download_image electronics electronics_001.jpg "https://s.alicdn.com/@sc04/kf/H50612859df50430baa8d4ebdc4d08084H.jpg_300x300.jpg"
download_image electronics electronics_002.jpg "https://s.alicdn.com/@sc04/kf/H980de8a075fe417192103cc2f5801da0x.jpg_300x300.jpg"
download_image electronics electronics_003.jpg "https://s.alicdn.com/@sc04/kf/Heb25ac61c91241028697b6336cfdf57fy.jpg_300x300.jpg"
download_image electronics electronics_004.jpg "https://s.alicdn.com/@sc04/kf/H01a8a04d2fe542ea8989fc0f397358fda.jpg_300x300.jpg"
download_image electronics electronics_005.jpg "https://s.alicdn.com/@sc04/kf/Haf9398ee328d4939a712de482e9f1104P.jpg_300x300.jpg"
download_image electronics electronics_006.jpg "https://s.alicdn.com/@sc04/kf/Hfb8c238b2a6c44b489c60980539c3d5dn.jpg_300x300.jpg"
download_image electronics electronics_007.jpg "https://s.alicdn.com/@sc04/kf/A569f534f8ff9447e847ab45914fd233aR.jpg_300x300.jpg"
download_image electronics electronics_008.jpg "https://s.alicdn.com/@sc04/kf/Hbf7061f16a0f45dfa3df37cba72152f6o.jpg_300x300.jpg"
download_image electronics electronics_009.jpg "https://s.alicdn.com/@sc04/kf/Hcb5e42116e2045dc8b3c5878a4ca3abaw.jpg_300x300.jpg"
download_image electronics electronics_010.jpg "https://s.alicdn.com/@sc04/kf/Hc9c96b05f8fa4e01b4a7bb681d563f6c6.png_300x300.png"

# ── clothing (t-shirts / fashion) ────────────────────────────────────────────
download_image clothing clothing_001.jpg "https://s.alicdn.com/@sc04/kf/H918c4db4f08948a1883a8d76781e58b0k.jpg_300x300.jpg"
download_image clothing clothing_002.jpg "https://s.alicdn.com/@sc04/kf/H9ca383f1d2404e3f9508e494578fc6adC.jpg_300x300.jpg"
download_image clothing clothing_003.jpg "https://s.alicdn.com/@sc04/kf/H951d461e21ca4031b5a73fca2ccfccf3e.jpg_300x300.jpg"
download_image clothing clothing_004.jpg "https://s.alicdn.com/@sc04/kf/H0262f7fd40904da8a2f32257eeabceacJ.jpg_300x300.jpg"
download_image clothing clothing_005.jpg "https://s.alicdn.com/@sc04/kf/Hdbe0e7b7f25a4e798bee6fe9b0d451c3v.jpg_300x300.jpg"
download_image clothing clothing_006.jpg "https://s.alicdn.com/@sc04/kf/Hadb0ced2957a462091c687ecf8ca4f05K.jpg_300x300.jpg"
download_image clothing clothing_007.jpg "https://s.alicdn.com/@sc04/kf/H450c755215e24f4da4f498525cf3e3aew.jpg_300x300.jpg"
download_image clothing clothing_008.jpg "https://s.alicdn.com/@sc04/kf/H3668dd3e8f3445a4ae9944696e0274a3g.jpg_300x300.jpg"
download_image clothing clothing_009.jpg "https://s.alicdn.com/@sc04/kf/Hddf53eb2e18c42afbc94c7ec52b76a46J.jpg_300x300.jpg"
download_image clothing clothing_010.jpg "https://s.alicdn.com/@sc04/kf/Hcd3f96cd6e8a411794ab5827ad750399V.jpg_300x300.jpg"

# ── shoes (sneakers / running) ────────────────────────────────────────────────
download_image shoes shoes_001.jpg "https://s.alicdn.com/@sc04/kf/H551c8b5fb925423d8100616d756eb794i.jpg_300x300.jpg"
download_image shoes shoes_002.jpg "https://s.alicdn.com/@sc04/kf/Haed34a9e226b4370ad4fad984902448ae.jpg_300x300.jpg"
download_image shoes shoes_003.jpg "https://s.alicdn.com/@sc04/kf/H5eac4884b22f41d794cd304f2e8ebe74D.jpg_300x300.jpg"
download_image shoes shoes_004.jpg "https://s.alicdn.com/@sc04/kf/H3cd1d4345aa445a18fac310f98971143w.jpg_300x300.jpg"
download_image shoes shoes_005.jpg "https://s.alicdn.com/@sc04/kf/Hef4f032d0c6749f7adeba75eeb8fbc48j.jpg_300x300.jpg"
download_image shoes shoes_006.jpg "https://s.alicdn.com/@sc04/kf/Hd9fe7900bc2e4cfaa71bd8cc21be74b6R.jpg_300x300.jpg"
download_image shoes shoes_007.jpeg "https://s.alicdn.com/@sc04/kf/A801e4dfe0ff04cb29019a22bdf27b59av.jpeg_300x300.jpeg"
download_image shoes shoes_008.jpg "https://s.alicdn.com/@sc04/kf/Ha181b8ca873249e2af617cc49eb5e4efZ.jpg_300x300.jpg"
download_image shoes shoes_009.jpg "https://s.alicdn.com/@sc04/kf/Aa629c25e32f942e791514368a86f16fdU.jpg_300x300.jpg"
download_image shoes shoes_010.jpg "https://s.alicdn.com/@sc04/kf/H56da924b87104eeabef4410209c23e59c.jpg_300x300.jpg"

# ── bags (handbags / backpacks) ───────────────────────────────────────────────
download_image bags bags_001.png "https://s.alicdn.com/@sc04/kf/H392d9c4c232848429654cde6571d51a3k.png_300x300.png"
download_image bags bags_002.png "https://s.alicdn.com/@sc04/kf/H8406276fb0214094a64399be85b5bc9cS.png_300x300.png"
download_image bags bags_003.jpg "https://s.alicdn.com/@sc04/kf/H085f00bb776b4471ad04ed13bdc1075b7.jpg_300x300.jpg"
download_image bags bags_004.png "https://s.alicdn.com/@sc04/kf/H9eaa7c2b61524ba5b54af0dbc40206ceD.png_300x300.png"
download_image bags bags_005.jpg "https://s.alicdn.com/@sc04/kf/Hc38eb5181d5648d8a50868f081283e5fe.jpg_300x300.jpg"
download_image bags bags_006.png "https://s.alicdn.com/@sc04/kf/H75d77139aeec4777982cfb3977986ba7b.png_300x300.png"
download_image bags bags_007.jpg "https://s.alicdn.com/@sc04/kf/H3f1d23968a714573a8f31fbd1a4129852.jpg_300x300.jpg"
download_image bags bags_008.jpg "https://s.alicdn.com/@sc04/kf/H6c254d951e174359a09523a060c6ba83S.jpg_300x300.jpg"
download_image bags bags_009.jpg "https://s.alicdn.com/@sc04/kf/H652a965dc3534511a2fc12fb1e5f8665q.jpg_300x300.jpg"
download_image bags bags_010.png "https://s.alicdn.com/@sc04/kf/S17a6c2361a45436b93aef086af2d042e9.png_300x300.png"

# ── furniture (chairs / sofas) ────────────────────────────────────────────────
download_image furniture furniture_001.jpg "https://s.alicdn.com/@sc04/kf/Hbb7b5cffcd99420487e85138dca171e4F.jpg_300x300.jpg"
download_image furniture furniture_002.jpg "https://s.alicdn.com/@sc04/kf/H06dad3c30580480daf54d016e390e8ef4.jpg_300x300.jpg"
download_image furniture furniture_003.jpg "https://s.alicdn.com/@sc04/kf/Hf914cfbb51824510890a4ef0cbf1bd41t.jpg_300x300.jpg"
download_image furniture furniture_004.jpg "https://s.alicdn.com/@sc04/kf/He51910be009942ad933d1834983999672.jpg_300x300.jpg"
download_image furniture furniture_005.jpg "https://s.alicdn.com/@sc04/kf/H6a902cbfc9264f15aa490bfc192e866bR.jpg_300x300.jpg"
download_image furniture furniture_006.jpg "https://s.alicdn.com/@sc04/kf/HTB1xJ6Ve21H3KVjSZFHq6zKppXaV.jpg_300x300.jpg"
download_image furniture furniture_007.jpg "https://s.alicdn.com/@sc04/kf/H614726ef345c42f7a8cc5ad6061b0502w.jpg_300x300.jpg"
download_image furniture furniture_008.png "https://s.alicdn.com/@sc04/kf/Hf2c376cd4f614c9f9d26d72e853e519dm.png_300x300.png"
download_image furniture furniture_009.jpg "https://s.alicdn.com/@sc04/kf/Ha9afb86e5332473ebdb4e38383161225r.jpg_300x300.jpg"
download_image furniture furniture_010.jpg "https://s.alicdn.com/@sc04/kf/Hb8d065d883fa4f3b805aa2770a9cedc86.jpg_300x300.jpg"

# ── kitchen (blenders / coffee makers) ───────────────────────────────────────
download_image kitchen kitchen_001.jpg "https://s.alicdn.com/@sc04/kf/H6288f41f8bdc4abc88fbba4e2f87692fY.jpg_300x300.jpg"
download_image kitchen kitchen_002.jpg "https://s.alicdn.com/@sc04/kf/Ha1db0eb504874cf6ba1ed161b1b8660ad.jpg_300x300.jpg"
download_image kitchen kitchen_003.jpg "https://s.alicdn.com/@sc04/kf/Heb31a718972b4cbd8040e64585e08dd6x.jpg_300x300.jpg"
download_image kitchen kitchen_004.jpg "https://s.alicdn.com/@sc04/kf/H912c5133b7904f82b0cbbd0915388e24L.jpg_300x300.jpg"
download_image kitchen kitchen_005.jpg "https://s.alicdn.com/@sc04/kf/H8dc3ac21143a4923ae24819b425122756.jpg_300x300.jpg"
download_image kitchen kitchen_006.png "https://s.alicdn.com/@sc04/kf/Ha8c7329ca84d40248c4fe1b69798bde6y.png_300x300.png"
download_image kitchen kitchen_007.jpg "https://s.alicdn.com/@sc04/kf/H37bd29e3b4594c9c95c512d70bb06625V.jpg_300x300.jpg"
download_image kitchen kitchen_008.jpg "https://s.alicdn.com/@sc04/kf/H639558f365ff458993c6c58282d1daf8x.jpg_300x300.jpg"
download_image kitchen kitchen_009.jpg "https://s.alicdn.com/@sc04/kf/Hf938a191427744eaa9ae0eb4b80a3585v.jpg_300x300.jpg"
download_image kitchen kitchen_010.png "https://s.alicdn.com/@sc04/kf/H56dbdafdfa3a4589be562dc0f5bff485h.png_300x300.png"

# ── tools (drills / hand tools) ───────────────────────────────────────────────
download_image tools tools_001.png "https://s.alicdn.com/@sc04/kf/Hcb2dbd67be684d41ae92bd577b30b4e8A.png_300x300.png"
download_image tools tools_002.jpg "https://s.alicdn.com/@sc04/kf/H0a62edcb0aaf4a86a33fba3b14053024E.jpg_300x300.jpg"
download_image tools tools_003.png "https://s.alicdn.com/@sc04/kf/Hbee68d0f29794c19b4e666a9fb0113a6d.png_300x300.png"
download_image tools tools_004.jpg "https://s.alicdn.com/@sc04/kf/H3d9e724bbd274c65b45ed64d89c6b9cf4.jpg_300x300.jpg"
download_image tools tools_005.png "https://s.alicdn.com/@sc04/kf/Hce0a71cd7ab44169acbe14d7e21d9720z.png_300x300.png"
download_image tools tools_006.jpg "https://s.alicdn.com/@sc04/kf/Hd9fccc4d4a9c48fab1fb7033e6eda6d50.jpg_300x300.jpg"
download_image tools tools_007.png "https://s.alicdn.com/@sc04/kf/H63a81914be1b4734809447bc31ad1a35B.png_300x300.png"
download_image tools tools_008.jpg "https://s.alicdn.com/@sc04/kf/Hd79829a2a303410090076f416c7974f8B.jpg_300x300.jpg"
download_image tools tools_009.jpg "https://s.alicdn.com/@sc04/kf/H6783e332ad2d44ee91c849ff0cbf8922u.jpg_300x300.jpg"
download_image tools tools_010.png "https://s.alicdn.com/@sc04/kf/H518cec6d285c4c2cba7981e11fe78e8bO.png_300x300.png"

# ── beauty (lipstick / skincare) ──────────────────────────────────────────────
download_image beauty beauty_001.jpg "https://s.alicdn.com/@sc04/kf/He626fb706d32430ba9c89eecb01a4968j.jpg_300x300.jpg"
download_image beauty beauty_002.jpg "https://s.alicdn.com/@sc04/kf/H9ce7bbc6629847d497f990af2a62316dN.jpg_300x300.jpg"
download_image beauty beauty_003.jpg "https://s.alicdn.com/@sc04/kf/H55c96e6d45a94c57b23997c8cf98eb3fM.jpg_300x300.jpg"
download_image beauty beauty_004.jpg "https://s.alicdn.com/@sc04/kf/H32b6f463b3aa4a00832c0588df917951L.jpg_300x300.jpg"
download_image beauty beauty_005.png "https://s.alicdn.com/@sc04/kf/Hae08fd8f842641379d3633e35baa2f3eH.png_300x300.png"
download_image beauty beauty_006.jpg "https://s.alicdn.com/@sc04/kf/Hbdda32e4ca074e358ec70a2c4b6b3bc9U.jpg_300x300.jpg"
download_image beauty beauty_007.jpg "https://s.alicdn.com/@sc04/kf/H82c3bb9b1846455ebd70b32c4534c891r.jpg_300x300.jpg"
download_image beauty beauty_008.jpg "https://s.alicdn.com/@sc04/kf/Ha987bbf6203b4f83a5f3abc8bde878fdy.jpg_300x300.jpg"
download_image beauty beauty_009.jpg "https://s.alicdn.com/@sc04/kf/H1723aa6e982c4db19b5fad1acd64bdfc2.jpg_300x300.jpg"
download_image beauty beauty_010.jpg "https://s.alicdn.com/@sc04/kf/He0cdb0aeabde41ca86879e7dc7709631X.jpg_300x300.jpg"

# ── toys (building blocks / lego-style) ──────────────────────────────────────
download_image toys toys_001.jpg "https://s.alicdn.com/@sc04/kf/H7872880f23284a0cbe1c849393f3a0c4O.jpg_300x300.jpg"
download_image toys toys_002.jpg "https://s.alicdn.com/@sc04/kf/HTB1VawUKf5TBuNjSspcq6znGFXaL.jpg_300x300.jpg"
download_image toys toys_003.png "https://s.alicdn.com/@sc04/kf/Hc4b1841609b241079077c1be6ac3b980W.png_300x300.png"
download_image toys toys_004.jpg "https://s.alicdn.com/@sc04/kf/HTB1ZNC.DKuSBuNjSsziq6zq8pXaH.jpg_300x300.jpg"
download_image toys toys_005.jpg "https://s.alicdn.com/@sc04/kf/H812fe12273314ad79eb877c3cb77e055t.jpg_300x300.jpg"
download_image toys toys_006.jpg "https://s.alicdn.com/@sc04/kf/H8bfd1341759e415e8e19d5275ddbb0f5d.jpg_300x300.jpg"
download_image toys toys_007.jpg "https://s.alicdn.com/@sc04/kf/H9a621090e01049808577533d97c673ccC.jpg_300x300.jpg"
download_image toys toys_008.png "https://s.alicdn.com/@sc04/kf/Hed2ce4598609432199c88c3a3d7e3db4C.png_300x300.png"
download_image toys toys_009.jpg "https://s.alicdn.com/@sc04/kf/H97a4c0d138324e01ac9a3a27c46f150fe.jpg_300x300.jpg"
download_image toys toys_010.jpg "https://s.alicdn.com/@sc04/kf/H9183118ef87d44d6a79463590b9cb698q.jpg_300x300.jpg"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done: $total downloaded, $errors failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next step: bash benchmark/run.sh"
