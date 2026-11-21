#!/bin/bash
# sheet.sh out.jpg cols width files... : labelled contact sheet (pads the last row)
out=$1; cols=$2; w=$3; shift 3; files=("$@"); n=${#files[@]}
rows=$(( (n + cols - 1) / cols )); inputs=""; f=""
for ((i=0;i<n;i++)); do inputs="$inputs -i ${files[$i]}"; b=$(basename ${files[$i]}); f="$f[$i]scale=$w:-2,drawtext=text='${b%.*}':fontcolor=yellow:fontsize=16:x=4:y=4[c$i];"; done
total=$((rows*cols)); for ((i=n;i<total;i++)); do f="$f[c0]split[c0][c$i];"; done
# split must come before use: rebuild with nullsrc padding instead
f=""; for ((i=0;i<n;i++)); do b=$(basename ${files[$i]}); f="$f[$i]scale=$w:-2,drawtext=text='${b%.*}':fontcolor=yellow:fontsize=16:x=4:y=4[c$i];"; done
h=$(( w * 16 / 9 )); for ((i=n;i<total;i++)); do f="${f}color=c=black:s=${w}x${h}:d=1[c$i];"; done
for ((r=0;r<rows;r++)); do for ((c=0;c<cols;c++)); do f="$f[c$((r*cols+c))]"; done; f="${f}hstack=$cols[r$r];"; done
if [ $rows -eq 1 ]; then f="${f%;}"; f="${f%[r0]}"; else for ((r=0;r<rows;r++)); do f="$f[r$r]"; done; f="${f}vstack=$rows"; fi
ffmpeg -v error -y $inputs -filter_complex "$f" -frames:v 1 $out
