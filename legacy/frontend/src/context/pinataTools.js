import FormData from "form-data";

export const uploadFileToIPFS = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const request = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
        },
        body: formData,
      }
    );

    const response = await request.json();
    return {
      success: true,
      pinataURL: "https://ipfs.io/ipfs/" + response.IpfsHash,
      ipfsHash: response.IpfsHash,
      timestamp: response.Timestamp,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};
