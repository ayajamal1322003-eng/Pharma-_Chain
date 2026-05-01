using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PharmaChain.Migrations
{
    public partial class AddNonceAndMerkle : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MerkleRoot",
                table: "DrugTransactions",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Nonce",
                table: "DrugTransactions",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MerkleRoot",
                table: "DrugTransactions");

            migrationBuilder.DropColumn(
                name: "Nonce",
                table: "DrugTransactions");
        }
    }
}
