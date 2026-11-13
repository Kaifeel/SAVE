package com.save.storage;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ImageOrientationTest {
    @Test void readsAllOrientationsFromPngAndWebpInBothByteOrders() throws Exception {
        for (var order : new ByteOrder[]{ByteOrder.BIG_ENDIAN, ByteOrder.LITTLE_ENDIAN}) {
            for (int orientation = 1; orientation <= 8; orientation++) {
                byte[] tiff = tiff(order, orientation);
                assertThat(ImageOrientation.read(png(tiff), "png")).isEqualTo(orientation);
                assertThat(ImageOrientation.read(webp(tiff), "webp")).isEqualTo(orientation);
            }
        }
    }

    @Test void rejectsOutOfBoundsExifDirectoryAndEntryCounts() {
        byte[] tiff = tiff(ByteOrder.BIG_ENDIAN, 1);
        ByteBuffer.wrap(tiff).putInt(4, -1);
        assertThatThrownBy(() -> ImageOrientation.read(png(tiff), "png")).isInstanceOf(IOException.class);
        byte[] manyEntries = tiff(ByteOrder.BIG_ENDIAN, 1);
        ByteBuffer.wrap(manyEntries).putShort(8, (short)65535);
        assertThatThrownBy(() -> ImageOrientation.read(png(manyEntries), "png")).isInstanceOf(IOException.class);
    }

    @Test void rejectsChunkLengthOverflow() {
        byte[] png = png(tiff(ByteOrder.BIG_ENDIAN, 1));
        ByteBuffer.wrap(png).putInt(8, -1);
        assertThatThrownBy(() -> ImageOrientation.read(png, "png")).isInstanceOf(IOException.class);
        byte[] webp = webp(tiff(ByteOrder.BIG_ENDIAN, 1));
        ByteBuffer.wrap(webp).order(ByteOrder.LITTLE_ENDIAN).putInt(16, -1);
        assertThatThrownBy(() -> ImageOrientation.read(webp, "webp")).isInstanceOf(IOException.class);
    }

    @Test void ignoresNonExifPayloadWithoutDecompressingIt() {
        byte[] png = png(new byte[]{0, 1, 2, 3});
        System.arraycopy(new byte[]{122,84,88,116}, 0, png, 12, 4); // zTXt with invalid compressed payload
        assertThatCode(() -> assertThat(ImageOrientation.read(png, "png")).isEqualTo(1)).doesNotThrowAnyException();
    }

    private static byte[] tiff(ByteOrder order, int orientation) {
        var buffer = ByteBuffer.allocate(26).order(order);
        buffer.putShort((short)(order == ByteOrder.LITTLE_ENDIAN ? 0x4949 : 0x4d4d));
        buffer.putShort((short)42).putInt(8).putShort((short)1);
        buffer.putShort((short)0x112).putShort((short)3).putInt(1).putShort((short)orientation).putShort((short)0).putInt(0);
        return buffer.array();
    }

    private static byte[] png(byte[] tiff) {
        var buffer = ByteBuffer.allocate(8 + 12 + tiff.length);
        buffer.position(8); buffer.putInt(tiff.length).put(new byte[]{101,88,73,102}).put(tiff).putInt(0);
        return buffer.array();
    }

    private static byte[] webp(byte[] tiff) {
        var buffer = ByteBuffer.allocate(20 + tiff.length).order(ByteOrder.LITTLE_ENDIAN);
        buffer.put(new byte[]{82,73,70,70}).putInt(buffer.capacity()-8).put(new byte[]{87,69,66,80});
        buffer.put(new byte[]{69,88,73,70}).putInt(tiff.length).put(tiff);
        return buffer.array();
    }
}
