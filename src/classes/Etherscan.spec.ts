import { expect } from "chai";
import sinon from "sinon";
import axios from "axios";
import { Etherscan } from "./Etherscan"; // Adjust path as needed

describe("Etherscan", () => {
    let sandbox: sinon.SinonSandbox;
    let axiosStub: sinon.SinonStub;
    const apiKey = "test-api-key";
    const chainId = 1; // Mainnet chainId for testing
    const contractAddress = "0x1234567890abcdef1234567890abcdef12345678";
    let etherscan: Etherscan;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        axiosStub = sandbox.stub(axios, "get");
        etherscan = new Etherscan(apiKey);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("constructor", () => {
        it("should initialize with the provided API key", () => {
            expect(etherscan["apiKey"]).to.equal(apiKey); // Access private property for testing
        });
    });

    describe("getCreationBlock", () => {
        it("should return the block number for a valid contract address", async () => {
            const mockResponse = {
                data: {
                    result: [{ blockNumber: "123456" }],
                },
            };
            axiosStub.resolves(mockResponse);

            const blockNumber = await etherscan.getCreationBlock(
                chainId,
                contractAddress
            );

            expect(blockNumber).to.equal(123456);
            expect(axiosStub.calledOnce).to.be.true;
            expect(
                axiosStub.calledWith(
                    `https://api.etherscan.io/api?chainid=${chainId}&module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${apiKey}`
                )
            ).to.be.true;
        });

        it("should throw an error if the API response is invalid", async () => {
            const mockResponse = {
                data: {
                    result: [], // Empty result
                },
            };
            axiosStub.resolves(mockResponse);

            try {
                await etherscan.getCreationBlock(chainId, contractAddress);
                expect.fail("Should have thrown an error");
            } catch (error) {
                if (error instanceof Error) {
                    expect(error.message).to.match(
                        /Failed to fetch creation block/
                    );
                    expect(error.message).to.include(
                        "Cannot read properties of undefined"
                    );
                } else {
                    expect.fail("Expected error to be an instance of Error");
                }
            }
        });

        it("should throw an error if the API request fails", async () => {
            const errorMessage = "Network Error";
            axiosStub.rejects(new Error(errorMessage));

            try {
                await etherscan.getCreationBlock(chainId, contractAddress);
                expect.fail("Should have thrown an error");
            } catch (error) {
                if (error instanceof Error) {
                    expect(error.message).to.equal(
                        `Failed to fetch creation block: Error: ${errorMessage}`
                    );
                } else {
                    expect.fail("Expected error to be an instance of Error");
                }
            }
        });

        it("should handle non-numeric block number in response", async () => {
            const mockResponse = {
                data: {
                    result: [{ blockNumber: "invalid" }],
                },
            };
            axiosStub.resolves(mockResponse);

            const blockNumber = await etherscan.getCreationBlock(
                chainId,
                contractAddress
            );

            expect(blockNumber).to.be.NaN;
        });
    });
});
