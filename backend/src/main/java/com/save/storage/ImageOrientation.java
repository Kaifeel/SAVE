package com.save.storage;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;

/** Reads only the uncompressed EXIF orientation; never expands text, ICC, or thumbnails. */
final class ImageOrientation {
    private ImageOrientation() {}

    static int read(byte[] bytes, String format) throws IOException {
        if ("jpg".equals(format)) return jpeg(bytes);
        if ("png".equals(format)) return chunks(bytes, 8, false);
        if ("webp".equals(format)) return chunks(bytes, 12, true);
        return 1;
    }

    private static int jpeg(byte[] bytes) throws IOException {
        int position = 2;
        while (position < bytes.length) {
            if ((bytes[position++] & 255) != 255) throw invalid();
            while (position < bytes.length && (bytes[position] & 255) == 255) position++;
            if (position >= bytes.length) throw invalid();
            int marker = bytes[position++] & 255;
            if (marker == 0xda || marker == 0xd9) return 1; // Scan data or end of image.
            if (marker == 1 || marker >= 0xd0 && marker <= 0xd8) continue;
            if (position > bytes.length - 2) throw invalid();
            int length = ((bytes[position] & 255) << 8) | (bytes[position + 1] & 255);
            if (length < 2 || length > bytes.length - position) throw invalid();
            if (marker == 0xe1 && matches(bytes, position + 2, "Exif\0\0")) {
                return tiff(bytes, position + 8, length - 8);
            }
            position += length;
        }
        return 1;
    }

    private static int chunks(byte[] bytes, int position, boolean webp) throws IOException {
        // RIFF length is the container boundary; appended bytes must never become metadata.
        long end = webp ? Integer.toUnsignedLong(ByteBuffer.wrap(bytes, 4, 4)
                .order(ByteOrder.LITTLE_ENDIAN).getInt()) + 8 : bytes.length;
        if (end > bytes.length) throw invalid();
        while (position <= end - (webp ? 8 : 12)) {
            int sizeOffset = webp ? position + 4 : position;
            long length = Integer.toUnsignedLong(ByteBuffer.wrap(bytes, sizeOffset, 4)
                    .order(webp ? ByteOrder.LITTLE_ENDIAN : ByteOrder.BIG_ENDIAN).getInt());
            long next = position + length + (webp ? 8 + (length & 1) : 12);
            if (next > end) throw invalid();
            int typeOffset = webp ? position : position + 4;
            if (matches(bytes, typeOffset, webp ? "EXIF" : "eXIf")) {
                int start = position + 8;
                if (webp && length >= 6 && matches(bytes, start, "Exif\0\0")) {
                    start += 6; length -= 6;
                }
                return tiff(bytes, start, (int) length);
            }
            if (!webp && matches(bytes, typeOffset, "IEND")) return 1;
            position = (int) next;
        }
        return 1;
    }

    private static int tiff(byte[] bytes, int offset, int length) throws IOException {
        if (length < 8 || offset < 0 || offset > bytes.length - length) throw invalid();
        ByteBuffer data = ByteBuffer.wrap(bytes, offset, length).slice();
        int order = Short.toUnsignedInt(data.getShort(0));
        if (order != 0x4949 && order != 0x4d4d) throw invalid();
        data.order(order == 0x4949 ? ByteOrder.LITTLE_ENDIAN : ByteOrder.BIG_ENDIAN);
        if (data.getShort(2) != 42) throw invalid();
        long directory = Integer.toUnsignedLong(data.getInt(4));
        if (directory < 8 || directory > length - 2) throw invalid();
        int count = Short.toUnsignedInt(data.getShort((int) directory));
        if (count > 256 || directory + 2 + (long) count * 12 > length) throw invalid();
        for (int index = 0; index < count; index++) {
            int entry = (int) directory + 2 + index * 12;
            if (Short.toUnsignedInt(data.getShort(entry)) != 0x112) continue;
            if (data.getShort(entry + 2) != 3 || data.getInt(entry + 4) != 1) throw invalid();
            int orientation = Short.toUnsignedInt(data.getShort(entry + 8));
            if (orientation < 1 || orientation > 8) throw invalid();
            return orientation;
        }
        return 1;
    }

    private static boolean matches(byte[] bytes, int offset, String text) {
        byte[] expected = text.getBytes(StandardCharsets.US_ASCII);
        if (offset < 0 || offset > bytes.length - expected.length) return false;
        for (int i = 0; i < expected.length; i++) if (bytes[offset + i] != expected[i]) return false;
        return true;
    }

    private static IOException invalid() { return new IOException("Invalid EXIF container"); }
}
