#!/bin/bash
# assemble.sh <parts dir> <mix.wav> <duration s> <out.mp4>: joins the rendered pieces in order, adds the
# soundtrack, encodes H.264 (high quality) + AAC 192k, faststart for phones.
set -e
D=$1; A=$2; T=$3; O=$4
L=$(mktemp); for f in $(ls $D/part_*.mp4 | sort); do echo "file '$f'" >> $L; done
ffmpeg -loglevel error -y -f concat -safe 0 -i $L -i $A -map 0:v -map 1:a -t $T \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -r 30 -c:a aac -b:a 192k -ar 48000 -movflags +faststart $O
rm -f $L
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact $O
